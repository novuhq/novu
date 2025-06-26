import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BaseRepository, SchemaKeys } from '../base.repository';
import { ClickHouseService } from '../clickhouse.service';
import { requestLogSchema, ORDER_BY } from './request-log.schema';

export const TABLE_NAME = 'requests';

@Injectable()
export class RequestLogRepository extends BaseRepository<typeof requestLogSchema> {
  public readonly table = TABLE_NAME;
  public readonly schema = requestLogSchema;
  public readonly schemaOrderBy: SchemaKeys<typeof requestLogSchema>[] = ORDER_BY;
  public readonly identifierPrefix = 'req_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger
  ) {
    super(clickhouseService, logger);
    this.logger.setContext(RequestLogRepository.name);
  }
}
