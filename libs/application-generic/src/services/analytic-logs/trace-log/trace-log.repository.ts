import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LogRepository } from '../base.repository';
import { ClickHouseService } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { traceLogSchema, ORDER_BY, TABLE_NAME } from './trace-log.schema';

@Injectable()
export class TraceLogRepository extends LogRepository<typeof traceLogSchema> {
  public readonly table = TABLE_NAME;
  public readonly identifierPrefix = 'trc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, traceLogSchema, ORDER_BY, featureFlagsService);
    this.logger.setContext(this.constructor.name);
  }
}
