import { Injectable, Optional } from '@nestjs/common';
import { PinoLogger } from '../../logging';
import { generateObjectId } from '../../utils/generate-id';
import {
  LogRepository,
  mapEventTypeToTitle,
  RequestLog,
  RequestLogRepository,
  RequestLogSourceEnum,
  RequestTraceInput,
  TraceLogRepository,
  TraceStatus,
} from '../analytic-logs';
import { InboundMailTenant } from './inbound-mail-tenant.resolver';
import { buildInboundRequestMetadata, InboundParseStrategy, InboundRequestSource } from './inbound-request-metadata';

const INBOUND_METHOD = 'INBOUND';

/**
 * HTTP-style status codes overloaded onto inbound mail outcomes so the existing
 * dashboard "Requests" status filter stays meaningful:
 *
 * - 202 = accepted for processing (worker has not yet attempted delivery)
 * - 200 = delivered successfully
 * - 422 = resolved but undeliverable (no route / config error)
 * - 502 = downstream delivery failure (webhook/agent/reply-to call failed)
 */
export const INBOUND_REQUEST_STATUS = {
  ACCEPTED: 202,
  DELIVERED: 200,
  UNDELIVERABLE: 422,
  DOWNSTREAM_FAILURE: 502,
} as const;

export interface InboundReceivedContext {
  source: InboundRequestSource;
  toAddress: string;
  tenant: InboundMailTenant;
  durationMs: number;
  /**
   * Strategy override — defaults to `inferInboundParseStrategy(toAddress)`.
   * The worker passes the resolved strategy when emitting the early row from
   * a synthetic test, but inbound-mail relies on the default.
   */
  strategy?: InboundParseStrategy;
}

export interface InboundCompletionContext {
  requestLogId: string;
  organizationId: string;
  environmentId: string;
  transactionId: string;
  message?: string;
}

/**
 * Centralized writer for the inbound-mail `requests` row plus its lifecycle
 * traces. Used by both `apps/inbound-mail` (early row at SMTP DATA acceptance,
 * plus `request_queued` / processing-failure traces) and `apps/worker`
 * (terminal delivered/failed trace).
 *
 * Failures in this writer never propagate — observability must not break the
 * inbound mail pipeline. Both feature flags must be enabled for any write to
 * happen: the shared `IS_ANALYTICS_LOGS_ENABLED` switch and the
 * inbound-specific `IS_INBOUND_ANALYTICS_LOGS_ENABLED` kill-switch.
 */
@Injectable()
export class InboundMailRequestLogger {
  constructor(
    private readonly requestLogRepository: RequestLogRepository,
    private readonly traceLogRepository: TraceLogRepository,
    @Optional() private readonly logger?: PinoLogger
  ) {
    this.logger?.setContext(this.constructor.name);
  }

  isEnabled(): boolean {
    return process.env.IS_ANALYTICS_LOGS_ENABLED === 'true' && process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED === 'true';
  }

  /**
   * Writes the early `requests` row (`status_code: 202`) plus a
   * `request_received` trace. Returns the generated `requestLogId` so callers
   * can thread it onto the BullMQ payload for the worker to link completion
   * traces.
   *
   * Returns `null` if the feature flags are disabled or the write fails — the
   * caller should still proceed with normal mail processing in that case.
   */
  async logReceived(context: InboundReceivedContext): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const requestLogId = `${this.requestLogRepository.identifierPrefix}${generateObjectId()}`;
    const strategy = context.strategy ?? inferStrategyFromTo(context.toAddress);

    try {
      await this.requestLogRepository.create(this.buildRequestLog(requestLogId, context, strategy), {
        organizationId: context.tenant.organizationId,
        environmentId: context.tenant.environmentId,
      });
    } catch (error) {
      this.logger?.warn(
        { err: error, transactionId: context.tenant.transactionId },
        'Failed to write inbound-email request log'
      );

      return null;
    }

    await this.appendTrace({
      requestLogId,
      organizationId: context.tenant.organizationId,
      environmentId: context.tenant.environmentId,
      transactionId: context.tenant.transactionId,
      eventType: 'request_received',
      status: 'success',
    });

    return requestLogId;
  }

  /**
   * Appends a `request_queued` trace after BullMQ enqueue succeeds.
   */
  async logQueued(context: InboundCompletionContext): Promise<void> {
    if (!this.isEnabled() || !context.requestLogId) {
      return;
    }

    await this.appendTrace({
      requestLogId: context.requestLogId,
      organizationId: context.organizationId,
      environmentId: context.environmentId,
      transactionId: context.transactionId,
      eventType: 'request_queued',
      status: 'success',
      message: context.message,
    });
  }

  /**
   * Appends a terminal `request_failed` trace when SMTP-side processing fails
   * after the early `requests` row was written (parse, validation, attachment
   * upload, etc.). The sending MTA may retry delivery.
   */
  async logProcessingFailed(context: InboundCompletionContext): Promise<void> {
    await this.logRequestFailed(context);
  }

  /**
   * Appends a `request_failed` trace when BullMQ enqueue fails (the SMTP
   * server returns 451 to the sending MTA). Mail is not lost, but it never
   * reaches the worker, so this is the terminal trace for that lifecycle.
   */
  async logQueueFailed(context: InboundCompletionContext): Promise<void> {
    await this.logRequestFailed(context);
  }

  /**
   * Worker-side terminal trace. Use `request_delivered` when the message was
   * delivered (status 200), and `request_failed` for any other terminal state
   * (422 unresolvable, 502 downstream failure, silent drop, exhausted retries).
   *
   * Use `status: 'warning'` for permanent customer-facing failures (422 / drops
   * / bad request) and `status: 'error'` for downstream/system failures (502 /
   * unhandled throws on final attempt).
   */
  async logCompleted(
    context: InboundCompletionContext & { delivered: boolean; severity?: TraceStatus }
  ): Promise<void> {
    if (!this.isEnabled() || !context.requestLogId) {
      return;
    }

    await this.appendTrace({
      requestLogId: context.requestLogId,
      organizationId: context.organizationId,
      environmentId: context.environmentId,
      transactionId: context.transactionId,
      eventType: context.delivered ? 'request_delivered' : 'request_failed',
      status: context.severity ?? (context.delivered ? 'success' : 'error'),
      message: context.message,
    });
  }

  private async logRequestFailed(context: InboundCompletionContext): Promise<void> {
    if (!this.isEnabled() || !context.requestLogId) {
      return;
    }

    await this.appendTrace({
      requestLogId: context.requestLogId,
      organizationId: context.organizationId,
      environmentId: context.environmentId,
      transactionId: context.transactionId,
      eventType: 'request_failed',
      status: 'error',
      message: context.message,
    });
  }

  private buildRequestLog(
    requestLogId: string,
    context: InboundReceivedContext,
    strategy: InboundParseStrategy
  ): Omit<RequestLog, 'expires_at'> {
    const path = `/inbound-mail/${strategy}`;

    return {
      id: requestLogId,
      created_at: LogRepository.formatDateTime64(new Date()),
      path,
      url: path,
      url_pattern: path,
      hostname: context.source.connection?.clientHostname || '',
      status_code: INBOUND_REQUEST_STATUS.ACCEPTED,
      method: INBOUND_METHOD,
      transaction_id: context.tenant.transactionId,
      ip: context.source.connection?.remoteAddress || '',
      user_agent: '',
      request_body: buildInboundRequestMetadata(context.source),
      response_body: '',
      user_id: '',
      organization_id: context.tenant.organizationId,
      environment_id: context.tenant.environmentId,
      auth_type: '',
      duration_ms: context.durationMs,
      source: RequestLogSourceEnum.INBOUND_EMAIL,
    };
  }

  private async appendTrace(params: {
    requestLogId: string;
    organizationId: string;
    environmentId: string;
    transactionId: string;
    eventType: 'request_received' | 'request_queued' | 'request_delivered' | 'request_failed';
    status: TraceStatus;
    message?: string;
  }): Promise<void> {
    const trace: RequestTraceInput = {
      created_at: LogRepository.formatDateTime64(new Date()),
      organization_id: params.organizationId,
      environment_id: params.environmentId,
      user_id: '',
      subscriber_id: '',
      external_subscriber_id: '',
      raw_data: '',
      entity_id: params.requestLogId,
      workflow_run_identifier: '',
      workflow_id: '',
      provider_id: '',
      event_type: params.eventType,
      title: mapEventTypeToTitle(params.eventType),
      status: params.status,
      message: params.message ?? '',
    };

    try {
      await this.traceLogRepository.createRequest([trace]);
    } catch (error) {
      this.logger?.warn(
        { err: error, requestLogId: params.requestLogId, eventType: params.eventType },
        'Failed to write inbound-email request trace'
      );
    }
  }
}

function inferStrategyFromTo(toAddress: string): InboundParseStrategy {
  return toAddress.includes('-nv-e=') ? 'reply-to' : 'domain-route';
}
