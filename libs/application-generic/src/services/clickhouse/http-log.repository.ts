import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BaseRepository } from './base.repository';
import { ClickHouseService } from './clickhouse.service';
import { httpLogSchema } from './http-log.schema';

export const TABLE_NAME = 'http_logs';

@Injectable()
export class HttpLogRepository extends BaseRepository<typeof httpLogSchema> {
  public readonly table = TABLE_NAME;
  public readonly schema = httpLogSchema;

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger
  ) {
    super(clickhouseService, logger);
    this.logger.setContext(HttpLogRepository.name);
  }
}
