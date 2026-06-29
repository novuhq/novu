import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import {
  InboundParseDroppedError,
  InboundParseProcessingError,
  isRetriableInboundFailureStatus,
} from './inbound-parse-outcome';
import { LogInboundEmailRequest } from './log-inbound-email-request.usecase';
import { DomainRouteStrategy } from './strategies/domain-route.strategy';
import { ReplyToStrategy } from './strategies/reply-to.strategy';

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
    const toAddress = command.to[0].address;

    this.logger.info({ toAddress }, 'Received new email to parse');

    try {
      const outcome = this.isReplyToAddress(toAddress)
        ? await this.replyToStrategy.execute(command)
        : await this.domainRouteStrategy.execute(command);

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

  private isReplyToAddress(address: string): boolean {
    return address.includes('-nv-e=');
  }
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'Inbound email processing failed';
}
