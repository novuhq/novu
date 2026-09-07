import { Injectable } from '@nestjs/common';
import { InboundMailRequestLogger, PinoLogger, TraceStatus } from '@novu/application-generic';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { InboundParseOutcome } from './inbound-parse-outcome';

export interface LogInboundEmailCompletedCommand {
  command: InboundEmailParseCommand;
  outcome: InboundParseOutcome;
}

/**
 * Writes the worker-side terminal trace for an inbound email — either
 * `request_delivered` (status 200) or `request_failed` (any other status).
 *
 * The early `requests` row, the `request_received` trace, and the
 * `request_queued` trace are all written in `apps/inbound-mail` as soon as
 * SMTP DATA completes (before parse/enqueue). The worker links its terminal
 * trace to that row via `command.requestLogId`.
 *
 * Failures here never propagate — observability must not break inbound mail
 * processing — and we silently no-op when no `requestLogId` is present so
 * jobs queued before the early-logging rollout still drain cleanly.
 */
@Injectable()
export class LogInboundEmailRequest {
  constructor(
    private readonly inboundMailRequestLogger: InboundMailRequestLogger,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute({ command, outcome }: LogInboundEmailCompletedCommand): Promise<void> {
    if (!command.requestLogId) {
      return;
    }

    try {
      await this.inboundMailRequestLogger.logCompleted({
        requestLogId: command.requestLogId,
        organizationId: outcome.organizationId,
        environmentId: outcome.environmentId,
        transactionId: outcome.transactionId,
        delivered: outcome.status >= 200 && outcome.status < 300,
        severity: severityFromInboundStatus(outcome.status),
        message: outcome.message,
      });
    } catch (error) {
      this.logger.warn(
        { err: error, transactionId: outcome.transactionId, strategy: outcome.strategy },
        'Failed to write inbound-email completion trace'
      );
    }
  }

  /**
   * Append a `request_failed` trace for a job that we cannot resolve to a
   * terminal `InboundParseOutcome` — e.g. silent shared-agent drops, malformed
   * addresses caught pre-resolution, or unhandled exceptions on the final
   * BullMQ retry. Tenant context is best-effort: callers pass whatever they
   * managed to resolve before the failure.
   */
  async logUnresolvedFailure(params: {
    requestLogId: string;
    message: string;
    organizationId?: string;
    environmentId?: string;
    transactionId?: string;
    severity?: TraceStatus;
  }): Promise<void> {
    if (!params.requestLogId) {
      return;
    }

    try {
      await this.inboundMailRequestLogger.logCompleted({
        requestLogId: params.requestLogId,
        organizationId: params.organizationId ?? '',
        environmentId: params.environmentId ?? '',
        transactionId: params.transactionId ?? '',
        delivered: false,
        severity: params.severity ?? 'error',
        message: params.message,
      });
    } catch (error) {
      this.logger.warn(
        { err: error, requestLogId: params.requestLogId },
        'Failed to write inbound-email unresolved-failure trace'
      );
    }
  }
}

/**
 * Map our overloaded inbound-mail status codes onto the `traces.status` column.
 *
 * - `2xx` → `success`
 * - `4xx` → `warning` (resolved but the customer cannot deliver — bad route,
 *   misconfigured webhook, SSRF policy block, etc. — non-retriable)
 * - `5xx` → `error` (downstream system failure — retriable; the worker only
 *   emits a trace once retries are exhausted)
 */
export function severityFromInboundStatus(status: number): TraceStatus {
  if (status >= 200 && status < 300) {
    return 'success';
  }
  if (status >= 400 && status < 500) {
    return 'warning';
  }

  return 'error';
}
