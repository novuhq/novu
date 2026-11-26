import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LogRepository,
  QueryBuilder,
  RequestLog,
  RequestLogRepository,
  RequestLogSource,
} from '@novu/application-generic';
import { ActivityRetentionService } from '../../../shared/services/activity-retention.service';
import { GetRequestsResponseDto, RequestLogResponseDto } from '../../dtos/get-requests.response.dto';
import { requestLogSelectColumns } from '../../shared/select.const';
import { GetRequestsCommand } from './get-requests.command';

function createdGteToIsoString(createdGte: number): string {
  const createdGteDate = new Date(createdGte);

  if (Number.isNaN(createdGteDate.getTime())) {
    throw new BadRequestException(
      `Invalid createdGte: ${createdGte}. Please provide a Unix timestamp in milliseconds.`
    );
  }

  return createdGteDate.toISOString();
}

@Injectable()
export class GetRequests {
  constructor(
    private readonly requestLogRepository: RequestLogRepository,
    private readonly activityRetentionService: ActivityRetentionService
  ) {}

  async execute(command: GetRequestsCommand): Promise<GetRequestsResponseDto> {
    const limit = command.limit || 10;
    const page = command.page || 0;
    const offset = page * limit;

    const retentionRange = await this.activityRetentionService.resolve({
      organizationId: command.organizationId,
      after: command.createdGte ? createdGteToIsoString(command.createdGte) : undefined,
    });

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

    if (command.source) {
      queryBuilder.whereEquals('source', command.source);
    }

    if (retentionRange.after) {
      queryBuilder.whereGreaterThanOrEqual(
        'created_at',
        LogRepository.formatDateTime64(new Date(retentionRange.after))
      );
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
        source: request.source as RequestLogSource,
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
