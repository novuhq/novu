import { Injectable } from '@nestjs/common';
import {
  generateObjectId,
  LogRepository,
  mapEventTypeToTitle,
  PinoLogger,
  RequestLog,
  RequestLogRepository,
  RequestLogSourceEnum,
  RequestTraceInput,
  TraceLogRepository,
} from '@novu/application-generic';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { buildInboundRequestMetadata, InboundParseOutcome } from './inbound-parse-outcome';

const INBOUND_METHOD = 'INBOUND';

export interface LogInboundEmailRequestCommand {
  command: InboundEmailParseCommand;
  outcome: InboundParseOutcome;
  durationMs: number;
}

/**
 * Centralized writer that mirrors an inbound email into the analytics `requests`
 * table (with `source = inbound_email`) plus the matching lifecycle traces, so
 * inbound mail shows up in the dashboard "Requests" view alongside HTTP triggers.
 *
 * Writes are gated by two env vars: the shared analytics switch
 * (`IS_ANALYTICS_LOGS_ENABLED`) and a dedicated inbound kill-switch
 * (`IS_INBOUND_ANALYTICS_LOGS_ENABLED`), both default off. Failures here never
 * propagate — observability must not break inbound mail processing.
 */
@Injectable()
export class LogInboundEmailRequest {
  constructor(
    private requestLogRepository: RequestLogRepository,
    private traceLogRepository: TraceLogRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  private isEnabled(): boolean {
    return (
      process.env.IS_ANALYTICS_LOGS_ENABLED === 'true' && process.env.IS_INBOUND_ANALYTICS_LOGS_ENABLED === 'true'
    );
  }

  async execute({ command, outcome, durationMs }: LogInboundEmailRequestCommand): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const requestId = `${this.requestLogRepository.identifierPrefix}${generateObjectId()}`;
    const context = {
      organizationId: outcome.organizationId,
      environmentId: outcome.environmentId,
    };
    const isFailure = outcome.status >= 400;

    try {
      await this.requestLogRepository.create(this.buildRequestLog(requestId, command, outcome, durationMs), context);
    } catch (error) {
      this.logger.warn(
        { err: error, transactionId: outcome.transactionId, strategy: outcome.strategy },
        'Failed to write inbound-email request log'
      );

      return;
    }

    try {
      await this.traceLogRepository.createRequest(this.buildTraces(requestId, outcome, isFailure));
    } catch (error) {
      this.logger.warn(
        { err: error, requestId, transactionId: outcome.transactionId },
        'Failed to write inbound-email request traces'
      );
    }
  }

  private buildRequestLog(
    requestId: string,
    command: InboundEmailParseCommand,
    outcome: InboundParseOutcome,
    durationMs: number
  ): Omit<RequestLog, 'expires_at'> {
    const path = `/inbound-mail/${outcome.strategy}`;

    return {
      id: requestId,
      created_at: LogRepository.formatDateTime64(new Date()),
      path,
      url: path,
      url_pattern: path,
      hostname: command.connection?.clientHostname || '',
      status_code: outcome.status,
      method: INBOUND_METHOD,
      transaction_id: outcome.transactionId,
      ip: command.connection?.remoteAddress || '',
      user_agent: '',
      request_body: buildInboundRequestMetadata(command),
      response_body: '',
      user_id: '',
      organization_id: outcome.organizationId,
      environment_id: outcome.environmentId,
      auth_type: '',
      duration_ms: durationMs,
      source: RequestLogSourceEnum.INBOUND_EMAIL,
    };
  }

  private buildTraces(requestId: string, outcome: InboundParseOutcome, isFailure: boolean): RequestTraceInput[] {
    const baseTrace: Omit<RequestTraceInput, 'event_type' | 'title' | 'status' | 'message'> = {
      created_at: LogRepository.formatDateTime64(new Date()),
      organization_id: outcome.organizationId,
      environment_id: outcome.environmentId,
      user_id: '',
      subscriber_id: '',
      external_subscriber_id: '',
      raw_data: '',
      entity_id: requestId,
      workflow_run_identifier: '',
      workflow_id: '',
      provider_id: '',
    };

    const receivedTrace: RequestTraceInput = {
      ...baseTrace,
      event_type: 'request_received',
      title: mapEventTypeToTitle('request_received'),
      status: 'success',
      message: '',
    };

    const terminalEventType = isFailure ? 'request_failed' : 'request_queued';
    const terminalTrace: RequestTraceInput = {
      ...baseTrace,
      event_type: terminalEventType,
      title: mapEventTypeToTitle(terminalEventType),
      status: isFailure ? 'error' : 'success',
      message: outcome.message || '',
    };

    return [receivedTrace, terminalTrace];
  }
}
