import { Injectable } from '@nestjs/common';
import { LogRepository, QueryBuilder, RequestLog, RequestLogRepository } from '@novu/application-generic';
import { GetRequestsResponseDto, RequestLogResponseDto } from '../../dtos/get-requests.response.dto';
import { requestLogSelectColumns } from '../../shared/select.const';
import { GetRequestsCommand } from './get-requests.command';

@Injectable()
export class GetRequests {
  constructor(private readonly requestLogRepository: RequestLogRepository) {}

  async execute(command: GetRequestsCommand): Promise<GetRequestsResponseDto> {
    const limit = command.limit || 10;
    const page = command.page || 0;
    const offset = page * limit;

    const queryBuilder = new QueryBuilder<RequestLog>({
      environmentId: command.environmentId,
    });

    if (command.statusCodes?.length) {
      queryBuilder.whereIn('status_code', command.statusCodes);
    }

    if (command.url) {
      queryBuilder.whereLike('url', `%${command.url}%`);
    }

    if (command.urlPattern) {
      queryBuilder.whereEquals('url_pattern', command.urlPattern);
    }

    if (command.transactionId) {
      queryBuilder.whereLike('transaction_id', `%${command.transactionId}%`);
    }

    if (command.createdGte) {
      queryBuilder.whereGreaterThanOrEqual('created_at', LogRepository.formatDateTime64(new Date(command.createdGte)));
    }

    const safeWhere = queryBuilder.build();

    const [findResult, total] = await Promise.all([
      this.requestLogRepository.find({
        where: safeWhere,
        limit,
        offset,
        orderBy: 'created_at',
        orderDirection: 'DESC',
        select: requestLogSelectColumns,
      }),
      this.requestLogRepository.count({ where: safeWhere }),
    ]);

    const mappedData: RequestLogResponseDto[] = findResult.data.map((request) => {
      return {
        id: request.id,
        createdAt: new Date(`${request.created_at} UTC`).toISOString(),
        method: request.method,
        path: request.path,
        statusCode: request.status_code,
        transactionId: request.transaction_id,
        requestBody: request.request_body,
        responseBody: request.response_body,
        url: request.url,
        urlPattern: request.url_pattern,
        hostname: request.hostname,
        ip: request.ip,
        userAgent: request.user_agent,
        authType: request.auth_type,
        durationMs: request.duration_ms,
        userId: request.user_id,
        organizationId: request.organization_id,
        environmentId: request.environment_id,
      };
    });

    return {
      data: mappedData,
      total,
      pageSize: limit,
      page,
    };
  }
}
