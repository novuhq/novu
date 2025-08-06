import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder, RequestLog, RequestLogRepository, Trace, TraceLogRepository } from '@novu/application-generic';
import { GetRequestResponseDto, TraceResponseDto } from '../../dtos/get-request-traces.response.dto';
import { mapRequestLogToResponseDto, mapTraceToResponseDto } from '../../shared/mappers';
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
    });

    const mappedRequest = mapRequestLogToResponseDto(request.data);
    const mappedTraces: TraceResponseDto[] = traceResult.data.map(mapTraceToResponseDto);

    return {
      request: mappedRequest,
      traces: mappedTraces,
    };
  }
}
