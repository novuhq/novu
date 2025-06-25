import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BaseRepository, SchemaKeys } from '../base.repository';
import { ClickHouseService } from '../clickhouse.service';
import { httpLogSchema, ORDER_BY } from './http-log.schema';

export const TABLE_NAME = 'http_logs';

@Injectable()
export class HttpLogRepository extends BaseRepository<typeof httpLogSchema> {
  public readonly table = TABLE_NAME;
  public readonly schema = httpLogSchema;
  public readonly schemaOrderBy: SchemaKeys<typeof httpLogSchema>[] = ORDER_BY;

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger
  ) {
    super(clickhouseService, logger);
    this.logger.setContext(HttpLogRepository.name);
  }
}
