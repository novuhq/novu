import { Injectable } from '@nestjs/common';
import { 
  LogRepository, 
  RequestLog, 
  RequestLogRepository, 
  SafeWhere, 
  TenantContext,
  QueryBuilder 
} from '@novu/application-generic';
import { GetRequestsResponseDto, RequestLogResponseDto } from '../../dtos/get-requests.response.dto';
import { mapRequestLogToResponseDto } from '../../shared/mappers';
import { GetRequestsCommand } from './get-requests.command';

@Injectable()
export class GetRequests {
  constructor(private readonly requestLogRepository: RequestLogRepository) {}

  async execute(command: GetRequestsCommand): Promise<GetRequestsResponseDto> {
    const limit = command.limit || 10;
    const page = command.page || 0;
    const offset = page * limit;

    // Build tenant context for safe query enforcement
    const tenant: TenantContext = {
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    };

    // Use QueryBuilder for better ergonomics and type safety
    const queryBuilder = new QueryBuilder<RequestLog>(tenant);

    // Add status codes filter
    if (command.statusCodes?.length) {
      queryBuilder.whereIn('status_code', command.statusCodes);
    }

    // Add URL filter (partial match)
    if (command.url) {
      queryBuilder.whereLike('url', `%${command.url}%`);
    }

    // Add URL pattern filter (exact match)
    if (command.url_pattern) {
      queryBuilder.whereEquals('url', command.url_pattern);
    }

    // Add transaction ID filter (partial match)
    if (command.transactionId) {
      queryBuilder.whereLike('transaction_id', `%${command.transactionId}%`);
    }

    // Add date range filter
    if (command.createdGte) {
      queryBuilder.whereGreaterThanOrEqual(
        'created_at', 
        LogRepository.formatDateTime64(new Date(command.createdGte))
      );
    }

    const safeWhere = queryBuilder.build();

    // Execute both queries in parallel using safe methods
    const [findResult, total] = await Promise.all([
      this.requestLogRepository.findSafe({
        where: safeWhere,
        limit,
        offset,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      }),
      this.requestLogRepository.countSafe({ where: safeWhere }),
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
