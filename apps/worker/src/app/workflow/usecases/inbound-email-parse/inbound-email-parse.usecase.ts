import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import {
  INBOUND_UNMATCHED_ROUTE_MESSAGE,
  InboundParseDroppedError,
  InboundParseOutcome,
  InboundParseProcessingError,
  isRetriableInboundFailureStatus,
} from './inbound-parse-outcome';
import { LogInboundEmailRequest } from './log-inbound-email-request.usecase';
import { DomainRouteStrategy } from './strategies/domain-route.strategy';
import { ReplyToStrategy } from './strategies/reply-to.strategy';

/**
 * Result of walking the recipient list through `DomainRouteStrategy`.
 *
 * `resolved` carries the first recipient that produced a verdict for its
 * tenant, `unmatched` means a verified Novu domain was found but no route
 * covered the address, and `unroutable` means no recipient belonged to Novu
 * at all.
 */
type DomainRouteAttempt =
  | { kind: 'resolved'; outcome: InboundParseOutcome | undefined }
  | { kind: 'unmatched'; outcome: InboundParseOutcome }
  | { kind: 'unroutable'; error?: BadRequestException };

/**
 * Worker entry point for inbound email parsing.
 *
 * Lifecycle ownership:
 * - The early `requests` row + `request_received` + `request_queued` traces are
 *   written by `apps/inbound-mail` before the BullMQ job is enqueued.
 * - This use case only writes the worker-side terminal trace
 *   (`request_delivered` / `request_failed`) linked via `command.requestLogId`.
 * - `LogInboundEmailRequest` no-ops when `requestLogId` is missing, so legacy
 *   jobs queued before the early-logging rollout drain cleanly without
 *   producing orphan rows.
 *
 * Terminal-trace policy:
 * - Strategy returns an outcome → trace `request_delivered` (200) or
 *   `request_failed` (4xx/5xx).
 * - Strategy throws `InboundParseProcessingError` with a 4xx outcome → trace
 *   `request_failed` once and stop (non-retriable).
 * - Strategy throws `InboundParseProcessingError` with a 5xx outcome →
 *   re-thrown without tracing so BullMQ can retry; the `failed` handler on
 *   `InboundParseWorker` writes exactly one terminal trace after the final
 *   attempt.
 * - Strategy throws `BadRequestException` (malformed address / unknown
 *   domain) → trace `request_failed` with `warning` severity (non-retriable).
 * - Strategy throws `InboundParseDroppedError` (silent shared-agent drop) →
 *   trace `request_failed` with `warning` severity (non-retriable).
 * - Any other throw → re-thrown so BullMQ retries; the per-job final-failure
 *   trace is written by the `failed` handler on `InboundParseWorker`.
 */
@Injectable()
export class InboundEmailParse {
  constructor(
    private replyToStrategy: ReplyToStrategy,
    private domainRouteStrategy: DomainRouteStrategy,
    private logInboundEmailRequest: LogInboundEmailRequest,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: InboundEmailParseCommand): Promise<void> {
    const recipients = getRoutingRecipients(command);

    this.logger.info(
      { recipientCount: recipients.length, envelopeRecipientCount: command.envelopeTo?.length ?? 0 },
      'Received new email to parse'
    );

    try {
      const outcome = await this.route(command, recipients);

      if (outcome) {
        await this.logInboundEmailRequest.execute({ command, outcome });

        return;
      }

      // Strategy returned `undefined` without throwing — historically used by
      // the shared agent-inbox path for "drop silently after logging". That
      // contract still works for callers we haven't migrated, but the parsed
      // mail now becomes invisible in the request detail view too. Emit a
      // warning trace so operators can still see why nothing was delivered.
      await this.logInboundEmailRequest.logUnresolvedFailure({
        requestLogId: command.requestLogId ?? '',
        message: 'Inbound mail dropped — no matching route or recipient',
        severity: 'warning',
      });
    } catch (error) {
      if (error instanceof InboundParseProcessingError && error.outcome) {
        if (isRetriableInboundFailureStatus(error.outcome.status)) {
          throw error;
        }

        await this.logInboundEmailRequest.execute({ command, outcome: error.outcome });

        return;
      }

      if (error instanceof InboundParseDroppedError) {
        await this.logInboundEmailRequest.logUnresolvedFailure({
          requestLogId: command.requestLogId ?? '',
          message: error.reason,
          organizationId: error.tenant?.organizationId,
          environmentId: error.tenant?.environmentId,
          transactionId: error.tenant?.transactionId,
          severity: 'warning',
        });

        return;
      }

      if (error instanceof BadRequestException) {
        await this.logInboundEmailRequest.logUnresolvedFailure({
          requestLogId: command.requestLogId ?? '',
          message: extractMessage(error),
          severity: 'warning',
        });

        return;
      }

      // For all other throws (DB error, unhandled exception, etc.) we let
      // BullMQ retry. The terminal trace for retries that exhaust comes from
      // the `failed` handler on the worker process.
      throw error;
    }
  }

  private async route(
    command: InboundEmailParseCommand,
    recipients: string[]
  ): Promise<InboundParseOutcome | undefined> {
    const replyToAddress = recipients.find(isReplyToAddress);

    if (!replyToAddress) {
      return this.executeDomainRoute(command, recipients);
    }

    try {
      return await this.replyToStrategy.execute(command, replyToAddress);
    } catch (error) {
      if (!isNonRetriableFailure(error)) {
        throw error;
      }

      /*
       * The reply-to marker is only a substring of the local part, so any
       * recipient can carry it without being a usable reply token. Retry the
       * remaining recipients as domain routes instead of dropping the message,
       * so one unusable address cannot suppress delivery for a legitimate
       * route on the same email. The original failure is surfaced when nothing
       * else is deliverable, keeping the reply-to diagnostics intact.
       */
      const fallback = await this.attemptDomainRoutes(
        command,
        recipients.filter((address) => address !== replyToAddress)
      );

      if (fallback.kind === 'resolved' && fallback.outcome && isDelivered(fallback.outcome)) {
        return fallback.outcome;
      }

      throw error;
    }
  }

  private async executeDomainRoute(
    command: InboundEmailParseCommand,
    recipients: string[]
  ): Promise<InboundParseOutcome | undefined> {
    const attempt = await this.attemptDomainRoutes(command, recipients);

    if (attempt.kind === 'unroutable') {
      throw attempt.error ?? new BadRequestException('Inbound email has no recipient address');
    }

    return attempt.outcome;
  }

  /**
   * Walk the recipients in order and stop on the first one that resolves to a
   * tenant verdict. Recipients that belong to no Novu domain
   * (`BadRequestException`) or to a domain without a covering route are
   * skipped, so an address in Cc or Bcc still routes when the primary
   * recipient is someone else.
   */
  private async attemptDomainRoutes(
    command: InboundEmailParseCommand,
    recipients: string[]
  ): Promise<DomainRouteAttempt> {
    let unmatched: InboundParseOutcome | undefined;
    let lastBadRequest: BadRequestException | undefined;

    for (const recipient of recipients) {
      try {
        const outcome = await this.domainRouteStrategy.execute(command, recipient);

        if (outcome && isUnmatchedRoute(outcome)) {
          unmatched = outcome;
          continue;
        }

        return { kind: 'resolved', outcome };
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }

        lastBadRequest = error;
      }
    }

    if (unmatched) {
      return { kind: 'unmatched', outcome: unmatched };
    }

    return { kind: 'unroutable', error: lastBadRequest };
  }
}

/**
 * Recipients that routing decisions are allowed to use.
 *
 * Only SMTP envelope recipients (`RCPT TO`) are trusted: they record where the
 * message was actually delivered, and they cover Cc and Bcc recipients — Bcc
 * is deliberately absent from the message headers. The `To`/`Cc` headers are
 * written by the sender and may name any address, including another tenant's
 * inbound address, so they are consulted only for payloads that carry no
 * envelope recipients at all (queue payloads predating envelope capture).
 */
function getRoutingRecipients(command: InboundEmailParseCommand): string[] {
  const envelopeRecipients = collectAddresses(command.envelopeTo);

  if (envelopeRecipients.length > 0) {
    return envelopeRecipients;
  }

  return collectAddresses([...(command.to ?? []), ...(command.cc ?? [])]);
}

function collectAddresses(recipients: unknown[] | undefined): string[] {
  const addresses = (recipients ?? [])
    .map(toRecipientAddress)
    .filter((address): address is string => Boolean(address))
    .map((address) => address.trim().toLowerCase())
    .filter((address) => address.length > 0);

  return [...new Set(addresses)];
}

function toRecipientAddress(recipient: unknown): string | undefined {
  if (typeof recipient === 'string') {
    return recipient;
  }

  if (!recipient || typeof recipient !== 'object' || !('address' in recipient)) {
    return undefined;
  }

  const address = recipient.address;

  return typeof address === 'string' ? address : undefined;
}

function isReplyToAddress(address: string): boolean {
  return address.includes('-nv-e=');
}

function isUnmatchedRoute(outcome: InboundParseOutcome): boolean {
  return outcome.status === 422 && outcome.message === INBOUND_UNMATCHED_ROUTE_MESSAGE;
}

function isDelivered(outcome: InboundParseOutcome): boolean {
  return outcome.status >= 200 && outcome.status < 300;
}

function isNonRetriableFailure(error: unknown): boolean {
  if (error instanceof BadRequestException) {
    return true;
  }

  return (
    error instanceof InboundParseProcessingError &&
    Boolean(error.outcome) &&
    !isRetriableInboundFailureStatus(error.outcome?.status ?? 0)
  );
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'Inbound email processing failed';
}
