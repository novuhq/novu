import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestLogRepository, TraceLogRepository } from '@novu/application-generic';
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
    const request = await this.requestLogRepository.findOne({
      where: [
        {
          transaction_id: { operator: '=', value: command.transactionId },
          organization_id: { operator: '=', value: command.organizationId },
          environment_id: { operator: '=', value: command.environmentId },
        },
      ],
    });

    if (!request) {
      throw new NotFoundException(`Request with transactionId ${command.transactionId} not found`);
    }

    const traceResult = await this.traceLogRepository.find({
      where: [
        {
          entity_id: { operator: '=', value: command.transactionId },
          entity_type: { operator: '=', value: 'request' },
          environment_id: { operator: '=', value: command.environmentId },
          organization_id: { operator: '=', value: command.organizationId },
        },
      ],
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
