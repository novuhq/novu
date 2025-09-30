import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import { getInsertOptions } from '../shared';
import { ORDER_BY, RequestLog, requestLogSchema, TABLE_NAME } from './request-log.schema';

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
    data: Omit<RequestLog, 'expires_at'>,
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
