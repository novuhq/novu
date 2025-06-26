import { Injectable } from '@nestjs/common';
import { subHours } from 'date-fns';
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

    if (command.statusCodes) {
      where.status_code = {
        operator: 'IN',
        value: command.statusCodes,
      };
    }

    if (command.url) {
      where.url = { operator: 'LIKE', value: `%${command.url}%` };
    }

    if (command.transactionId) {
      where.transaction_id = command.transactionId;
    }

    if (command.hoursAgo) {
      where.created_at = {
        operator: '>=',
        value: subHours(new Date(), command.hoursAgo).toISOString().slice(0, 19).replace('T', ' ') as any,
      };
    }

    const [findResult, total] = await Promise.all([
      this.httpLogRepository.find({
        where,
        limit,
        offset,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      }),
      this.httpLogRepository.count({ where }),
    ]);

    const mappedData = findResult.data.map((log) => ({
      id: log.transaction_id || '',
      createdAt: new Date(`${log.created_at} UTC`).toISOString(),
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
