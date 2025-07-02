import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BaseRepository } from '../base.repository';
import { ClickHouseService } from '../clickhouse.service';
import { traceSchema, ORDER_BY, TABLE_NAME } from './trace.schema';

@Injectable()
export class TraceLogRepository extends BaseRepository<typeof traceSchema> {
  public readonly table = TABLE_NAME;
  public readonly identifierPrefix = 'trc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger
  ) {
    super(clickhouseService, logger, traceSchema, ORDER_BY);
    this.logger.setContext(this.constructor.name);
  }
}
