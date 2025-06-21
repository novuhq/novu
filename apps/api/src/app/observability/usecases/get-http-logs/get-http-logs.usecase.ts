import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '@novu/application-generic';
import { GetHttpLogsCommand } from './get-http-logs.command';
import { GetHttpLogsResponseDto } from '../../dtos/get-http-logs-response.dto';

@Injectable()
export class GetHttpLogs {
  constructor(private readonly clickhouseService: ClickHouseService) {}

  async execute(command: GetHttpLogsCommand): Promise<GetHttpLogsResponseDto> {
    const whereClauses: string[] = ['organization_id = {organizationId:String}'];
    const params: Record<string, unknown> = {
      organizationId: command.organizationId,
    };

    if (command.statusCode) {
      whereClauses.push('status_code = {statusCode:String}');
      params.statusCode = command.statusCode;
    }

    if (command.url) {
      whereClauses.push('url LIKE {url:String}');
      params.url = `%${command.url}%`;
    }

    if (command.transactionId) {
      whereClauses.push('transaction_id = {transactionId:String}');
      params.transactionId = command.transactionId;
    }

    if (command.days) {
      whereClauses.push('timestamp >= {startDate:DateTime}');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(command.days, 10));
      params.startDate = startDate;
    }

    const query = `
      SELECT *
      FROM http_logs
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    params.limit = command.limit || 10;
    params.offset = (command.page || 0) * (command.limit || 10);

    const { data, rows: total } = await this.clickhouseService.query({
      query,
      params,
    });

    return {
      data: data as any[],
      total,
      pageSize: command.limit,
      page: command.page,
    };
  }
}
