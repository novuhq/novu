import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LogRepository } from '../log.repository';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { requestLogSchema, ORDER_BY, RequestLog } from './request-log.schema';
import { getInsertOptions } from '../shared';

export const TABLE_NAME = 'requests';

const REQUEST_LOG_INSERT_OPTIONS: InsertOptions = getInsertOptions(
  process.env.REQUEST_LOGS_ASYNC_INSERT,
  process.env.REQUEST_LOGS_WAIT_ASYNC_INSERT
);

@Injectable()
export class RequestLogRepository extends LogRepository<typeof requestLogSchema, RequestLog> {
  public readonly table = TABLE_NAME;
  public readonly identifierPrefix = 'req_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, requestLogSchema, ORDER_BY, featureFlagsService);
    this.logger.setContext(this.constructor.name);
  }

  public async create(
    data: Omit<RequestLog, 'id' | 'expires_at'>,
    context: {
      organizationId?: string;
      environmentId?: string;
      userId?: string;
    }
  ): Promise<void> {
    await super.insert(data, context, REQUEST_LOG_INSERT_OPTIONS);
  }

  public async createMany(
    data: Omit<RequestLog, 'id' | 'expires_at'>[],
    context: {
      organizationId?: string;
      environmentId?: string;
      userId?: string;
    }
  ): Promise<void> {
    await super.insertMany(data, context, REQUEST_LOG_INSERT_OPTIONS);
  }
}
