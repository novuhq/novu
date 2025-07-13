import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LogRepository } from '../log.repository';
import { ClickHouseService } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { requestLogSchema, ORDER_BY } from './request-log.schema';

export const TABLE_NAME = 'requests';

@Injectable()
export class RequestLogRepository extends LogRepository<typeof requestLogSchema> {
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
}
