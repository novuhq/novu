import { createClient, ClickHouseClient, ClickHouseClientConfigOptions, PingResult } from '@clickhouse/client';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
  private client: ClickHouseClient | undefined;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);

    const requiredConnectionConfig = {
      url: process.env.CLICK_HOUSE_URL,
      username: process.env.CLICK_HOUSE_USER,
      password: process.env.CLICK_HOUSE_PASSWORD,
      database: process.env.CLICK_HOUSE_DATABASE,
    };

    if (Object.values(requiredConnectionConfig).some((value) => !value)) {
      this.logger.warn(
        'ClickHouse client is not initialized due to missing environment configuration. Please provide CLICK_HOUSE_URL, CLICK_HOUSE_USER, CLICK_HOUSE_PASSWORD, and CLICK_HOUSE_DATABASE.'
      );
      this.client = undefined;

      return;
    }

    this.client = createClient(requiredConnectionConfig as ClickHouseClientConfigOptions);

    this.logger.info('ClickHouse client created');
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }
    await this.client.close();
    this.logger.info('ClickHouse client closed');
  }

  async ping(): Promise<PingResult> {
    if (!this.client) {
      return { success: false, error: new Error('ClickHouse client not initialized') };
    }

    try {
      const isAlive = await this.client.ping();
      this.logger.info('ClickHouse server ping successful');

      return isAlive;
    } catch (error) {
      this.logger.error('ClickHouse server ping failed', error);
      throw error;
    }
  }

  async query<T>({
    query,
    params,
  }: {
    query: string;
    params: Record<string, unknown>;
  }): Promise<{ data: T[]; rows: number }> {
    if (!this.client) {
      throw new Error('ClickHouse client not initialized');
    }

    const resultSet = await this.client.query({
      query,
      query_params: params,
      format: 'JSON',
    });

    const data = (await resultSet.json()) as {
      data: T[];
      rows: number;
    };

    return data;
  }

  public async insert<T extends Record<string, unknown>>(table: string, values: T[]) {
    if (!this.client) {
      return;
    }

    await this.client.insert({
      table,
      values,
      format: 'JSONEachRow',
    });
  }
}
