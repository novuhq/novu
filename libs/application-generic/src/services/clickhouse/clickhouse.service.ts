import { createClient, ClickHouseClient, ClickHouseClientConfigOptions, PingResult } from '@clickhouse/client';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AnalyticsHttpLog, AnalyticsTablesEnum } from './types';

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
  private client: ClickHouseClient;

  constructor(private readonly logger: PinoLogger) {
    this.client = createClient({
      url : process.env.CLICK_HOUSE_URL,
      username : process.env.CLICK_HOUSE_USER,
      password : process.env.CLICK_HOUSE_PASSWORD,
      database : process.env.CLICK_HOUSE_DATABASE,
    });

    this.logger.setContext(this.constructor.name);
    this.logger.info('ClickHouse client created');
  }

  async onModuleDestroy() {
    await this.client.close();
    this.logger.info('ClickHouse client closed');
  }

  async ping(): Promise<PingResult> {
    try {
      const isAlive = await this.client.ping();
      this.logger.info('ClickHouse server ping successful');

      return isAlive;
    } catch (error) {
      this.logger.error('ClickHouse server ping failed', error);
      throw error;
    }
  }

  public async insertHttpLog(value: AnalyticsHttpLog) {
    await this.client.insert({
      table: AnalyticsTablesEnum.HTTP_LOGS,
      values: [value],
      format: 'JSONEachRow',
    });
  }
}
