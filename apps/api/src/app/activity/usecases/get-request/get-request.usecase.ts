import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder, RequestLog, RequestLogRepository, Trace, TraceLogRepository } from '@novu/application-generic';
import { GetRequestResponseDto, TraceResponseDto } from '../../dtos/get-request.response.dto';
import { mapRequestLogToResponseDto, mapTraceToResponseDto } from '../../shared/mappers';
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

    const mappedRequest = mapRequestLogToResponseDto({
      id: request.data.id,
      createdAt: request.data.created_at,
      method: request.data.method,
      path: request.data.path,
      statusCode: request.data.status_code,
      transactionId: request.data.transaction_id,
      requestBody: request.data.request_body,
      responseBody: request.data.response_body,
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
      request: mappedRequest,
      traces: mappedTraces,
    };
  }
}
