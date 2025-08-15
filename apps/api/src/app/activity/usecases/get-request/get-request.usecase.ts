import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder, RequestLog, RequestLogRepository, Trace, TraceLogRepository } from '@novu/application-generic';
import { GetRequestResponseDto, TraceResponseDto } from '../../dtos/get-request-traces.response.dto';
import { mapRequestLogToResponseDto, mapTraceToResponseDto } from '../../shared/mappers';
import { GetRequestCommand } from './get-request.command';

// Define minimal required columns for request logs
const requestLogSelectColumns = [
  'id',
  'environment_id',
  'organization_id',
  'user_id',
  'request_method',
  'request_url',
  'request_headers',
  'request_body',
  'response_status',
  'response_headers',
  'response_body',
  'created_at',
] as const;
type RequestLogFetchResult = Pick<RequestLog, (typeof requestLogSelectColumns)[number]>;

const traceSelectColumns = [
  'trace_id',
  'entity_id',
  'entity_type',
  'event_type',
  'organization_id',
  'environment_id',
  'user_id',
  'parent_trace_id',
  'data',
  'created_at',
] as const;
type TraceFetchResult = Pick<Trace, (typeof traceSelectColumns)[number]>;

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

    const mappedRequest = mapRequestLogToResponseDto(request.data);
    const mappedTraces: TraceResponseDto[] = traceResult.data.map(mapTraceToResponseDto);

    return {
      request: mappedRequest,
      traces: mappedTraces,
    };
  }
}
