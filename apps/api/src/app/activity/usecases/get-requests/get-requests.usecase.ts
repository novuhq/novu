import { Injectable } from '@nestjs/common';
import { LogRepository, RequestLog, RequestLogRepository, Where } from '@novu/application-generic';
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

    const where: Where<RequestLog> = [
      { organization_id: { operator: '=', value: command.organizationId } },
      { environment_id: { operator: '=', value: command.environmentId } },
    ];

    if (command.statusCodes) {
      where.push({
        status_code: {
          operator: 'IN',
          value: command.statusCodes,
        },
      });
    }

    if (command.url) {
      where.push({
        url: {
          operator: 'LIKE',
          value: `%${command.url}%`,
        },
      });
    }

    if (command.url_pattern) {
      where.push({
        url: {
          operator: '=',
          value: command.url_pattern,
        },
      });
    }

    if (command.transactionId) {
      where.push({
        transaction_id: {
          operator: 'LIKE',
          value: `%${command.transactionId}%`,
        },
      });
    }

    if (command.createdGte) {
      where.push({
        created_at: {
          operator: '>=',
          value: LogRepository.formatDateTime64(new Date(command.createdGte)),
        },
      });
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
