import { Injectable } from '@nestjs/common';
import { HttpLog, HttpLogRepository, Where } from '@novu/application-generic';
import { GetRequestsCommand } from './get-requests.command';
import { GetRequestsResponseDto } from '../../dtos/get-requests.response.dto';

@Injectable()
export class GetRequests {
  constructor(private readonly httpLogRepository: HttpLogRepository) {}

  async execute(command: GetRequestsCommand): Promise<GetRequestsResponseDto> {
    const limit = command.limit || 10;
    const page = command.page || 0;
    const offset = page * limit;

    const where: Where<HttpLog> = {
      organization_id: command.organizationId,
    };

    if (command.statusCode) {
      where.status_code = parseInt(command.statusCode, 10);
    }

    if (command.url) {
      where.url = { operator: 'LIKE', value: `%${command.url}%` };
    }

    if (command.transactionId) {
      where.transaction_id = command.transactionId;
    }

    if (command.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(command.days, 10));
      where.timestamp = {
        operator: '>=',
        value: startDate,
      };
    }

    const [findResult, total] = await Promise.all([
      this.httpLogRepository.find({
        where,
        limit,
        offset,
        orderBy: 'timestamp',
        orderDirection: 'DESC',
      }),
      this.httpLogRepository.count({ where }),
    ]);

    const mappedData = findResult.data.map((log) => ({
      id: log.transaction_id || new Date(log.timestamp || 0).getTime().toString(),
      timestamp: new Date(log.timestamp || 0).toISOString(),
      url: log.url || '',
      method: log.method || '',
      statusCode: log.status_code || 0,
      path: log.path || '',
      hostname: log.hostname || '',
      transactionId: log.transaction_id || null,
      ip: log.ip || '',
      userAgent: log.user_agent || '',
      queryParams: log.query_params || '',
      requestBody: log.request_body || '',
      responseBody: log.response_body || '',
      userId: log.user_id || '',
      organizationId: log.organization_id || '',
      environmentId: log.environment_id || '',
      schemaType: log.schema_type || '',
      durationMs: log.duration_ms || 0,
    }));

    return {
      data: mappedData,
      total,
      pageSize: limit,
      page,
    };
  }
}
