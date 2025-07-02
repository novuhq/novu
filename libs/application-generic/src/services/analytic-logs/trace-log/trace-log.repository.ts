import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BaseRepository } from '../base.repository';
import { ClickHouseService } from '../clickhouse.service';
import { traceLogSchema, ORDER_BY, TABLE_NAME } from './trace-log.schema';

@Injectable()
export class TraceLogRepository extends BaseRepository<typeof traceLogSchema> {
  public readonly table = TABLE_NAME;
  public readonly identifierPrefix = 'trc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger
  ) {
    super(clickhouseService, logger, traceLogSchema, ORDER_BY);
    this.logger.setContext(this.constructor.name);
  }
}
