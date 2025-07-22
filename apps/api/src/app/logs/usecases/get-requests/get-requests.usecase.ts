import { Injectable } from '@nestjs/common';
import { subHours } from 'date-fns';
import { RequestLog, RequestLogRepository, Where } from '@novu/application-generic';
import { GetRequestsCommand } from './get-requests.command';
import { GetRequestsResponseDto, RequestLogResponseDto } from '../../dtos/get-requests.response.dto';
import { mapRequestLogToResponseDto } from '../../shared/mappers';

@Injectable()
export class GetRequests {
  constructor(private readonly requestLogRepository: RequestLogRepository) {}

  async execute(command: GetRequestsCommand): Promise<GetRequestsResponseDto> {
    const limit = command.limit || 10;
    const page = command.page || 0;
    const offset = page * limit;

    const where: Where<RequestLog> = {
      organization_id: command.organizationId,
      environment_id: command.environmentId,
    };

    if (command.statusCodes) {
      where.status_code = {
        operator: 'IN',
        value: command.statusCodes,
      };
    }

    if (command.url) {
      where.url = { operator: 'LIKE', value: `%${command.url}%` };
    }

    if (command.url_pattern) {
      where.url = command.url_pattern;
    }

    if (command.transactionId) {
      where.transaction_id = { operator: 'LIKE', value: `%${command.transactionId}%` };
    }

    if (command.hoursAgo) {
      where.created_at = {
        operator: '>=',
        value: subHours(new Date(), command.hoursAgo).toISOString().slice(0, -1) as any,
      };
    }

    const [findResult, total] = await Promise.all([
      this.requestLogRepository.find({
        where,
        limit,
        offset,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      }),
      this.requestLogRepository.count({ where }),
    ]);

    const mappedData: RequestLogResponseDto[] = findResult.data.map(mapRequestLogToResponseDto);

    return {
      data: mappedData,
      total,
      pageSize: limit,
      page,
    };
  }
}
