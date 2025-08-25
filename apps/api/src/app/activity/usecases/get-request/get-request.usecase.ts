import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder, RequestLog, RequestLogRepository, Trace, TraceLogRepository } from '@novu/application-generic';
import { GetRequestResponseDto, TraceResponseDto } from '../../dtos/get-request.response.dto';
import { mapTraceToResponseDto } from '../../shared/mappers';
import { requestLogSelectColumns, traceSelectColumns } from '../../shared/select.const';
import { GetRequestCommand } from './get-request.command';

@Injectable()
export class GetRequest {
  constructor(
    private readonly requestLogRepository: RequestLogRepository,
    private readonly traceLogRepository: TraceLogRepository
  ) {}

  async execute(command: GetRequestCommand): Promise<GetRequestResponseDto> {
    const requestQueryBuilder = new QueryBuilder<RequestLog>({
      environmentId: command.environmentId,
    });
    requestQueryBuilder.whereEquals('id', command.requestId);
    requestQueryBuilder.whereEquals('organization_id', command.organizationId);

    const request = await this.requestLogRepository.findOne({
      where: requestQueryBuilder.build(),
      select: requestLogSelectColumns,
    });

    if (!request?.data) {
      throw new NotFoundException(`Request with requestId ${command.requestId} not found`);
    }

    const traceQueryBuilder = new QueryBuilder<Trace>({
      environmentId: command.environmentId,
    });
    traceQueryBuilder.whereEquals('entity_id', command.requestId);
    traceQueryBuilder.whereEquals('entity_type', 'request');
    traceQueryBuilder.whereEquals('organization_id', command.organizationId);

    const traceResult = await this.traceLogRepository.find({
      where: traceQueryBuilder.build(),
      orderBy: 'created_at',
      orderDirection: 'ASC',
      select: traceSelectColumns,
    });

    const mappedTraces: TraceResponseDto[] = traceResult.data.map((trace) =>
      mapTraceToResponseDto({
        id: trace.id,
        createdAt: trace.created_at,
        eventType: trace.event_type,
        title: trace.title,
        message: trace.message ?? '',
        rawData: trace.raw_data ?? '',
        status: trace.status,
        entityType: trace.entity_type,
        entityId: trace.entity_id,
        organizationId: trace.organization_id,
        environmentId: trace.environment_id,
        userId: trace.user_id ?? '',
        externalSubscriberId: trace.external_subscriber_id ?? '',
        subscriberId: trace.subscriber_id ?? '',
      })
    );

    return {
      request: {
        id: request.data.id,
        createdAt: new Date(`${request.data.created_at} UTC`).toISOString(),
        url: request.data.url,
        urlPattern: request.data.url_pattern,
        method: request.data.method,
        statusCode: request.data.status_code,
        path: request.data.path,
        hostname: request.data.hostname,
        ip: request.data.ip,
        userAgent: request.data.user_agent,
        requestBody: request.data.request_body,
        responseBody: request.data.response_body,
        userId: request.data.user_id,
        organizationId: request.data.organization_id,
        environmentId: request.data.environment_id,
        authType: request.data.auth_type,
        durationMs: request.data.duration_ms,
        transactionId: request.data.transaction_id,
      },
      traces: mappedTraces,
    };
  }
}
