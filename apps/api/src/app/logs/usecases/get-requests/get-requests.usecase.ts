import { Injectable } from '@nestjs/common';
import { subHours } from 'date-fns';
import { RequestLog, RequestLogRepository, Where } from '@novu/application-generic';
import { GetRequestsCommand } from './get-requests.command';
import { GetRequestsResponseDto, RequestLogResponseDto } from '../../dtos/get-requests.response.dto';

@Injectable()
export class GetRequests {
  constructor(private readonly requestLogRepository: RequestLogRepository) {}

  async execute(command: GetRequestsCommand): Promise<GetRequestsResponseDto> {
    const limit = command.limit || 10;
    const page = command.page || 0;
    const offset = page * limit;

    const where: Where<RequestLog> = {
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
      this.requestLogRepository.find({
        where,
        limit,
        offset,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      }),
      this.requestLogRepository.count({ where }),
    ]);

    const mappedData: RequestLogResponseDto[] = findResult.data.map((log) => ({
      id: log.id,
      createdAt: new Date(`${log.created_at} UTC`).toISOString(),
      url: log.url,
      urlPattern: log.url_pattern,
      method: log.method,
      path: log.path,
      statusCode: log.status_code,
      hostname: log.hostname,
      transactionId: log.transaction_id,
      ip: log.ip,
      userAgent: log.user_agent,
      requestBody: log.request_body,
      responseBody: log.response_body,
      userId: log.user_id,
      organizationId: log.organization_id,
      environmentId: log.environment_id,
      schemaType: log.schema_type,
      durationMs: log.duration_ms,
    }));

    return {
      data: mappedData,
      total,
      pageSize: limit,
      page,
    };
  }
}
