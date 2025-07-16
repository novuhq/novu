import { createClient, ClickHouseClient, ClickHouseClientConfigOptions, PingResult } from '@clickhouse/client';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

export { ClickHouseClient };

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
  private _client: ClickHouseClient | undefined;

  async init() {
    const requiredConnectionConfig = {
      url: process.env.CLICK_HOUSE_URL,
      username: process.env.CLICK_HOUSE_USER,
      password: process.env.CLICK_HOUSE_PASSWORD,
      database: process.env.CLICK_HOUSE_DATABASE,
    };

    if (!process.env.CLICK_HOUSE_URL || !process.env.CLICK_HOUSE_DATABASE) {
      /*
       * this.logger.warn(
       *   'ClickHouse client is not initialized due to missing environment configuration. ' +
       *     'Please provide CLICK_HOUSE_URL and CLICK_HOUSE_DATABASE.'
       * );
       */
      this._client = undefined;

      return;
    }

    if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test') {
      const defaultClient = createClient({
        host: 'http://localhost:8123',
        username: 'default',
        password: '',
        database: 'default',
      });

      try {
        await defaultClient.query({
          query: `CREATE DATABASE IF NOT EXISTS ${process.env.CLICK_HOUSE_DATABASE}`,
        });
        // this.logger.info(`Database "${process.env.CLICK_HOUSE_DATABASE}" ensured.`);
      } catch (error) {
        // this.logger.error(`Failed to create database ${process.env.CLICK_HOUSE_DATABASE}:`, error);
      }
    }

    this._client = createClient(requiredConnectionConfig as ClickHouseClientConfigOptions);

    // this.logger.info('ClickHouse client created');
  }

  get client(): ClickHouseClient | undefined {
    return this._client;
  }

  async onModuleDestroy() {
    if (!this._client) {
      return;
    }
    await this._client.close();
    // this.logger.info('ClickHouse client closed');
  }

  async ping(): Promise<PingResult> {
    if (!this._client) {
      return { success: false, error: new Error('Ping failed: ClickHouse client not initialized') };
    }

    // eslint-disable-next-line no-useless-catch
    try {
      const isAlive = await this._client.ping();
      // this.logger.info('ClickHouse server ping successful');

      return isAlive;
    } catch (error) {
      // this.logger.error('ClickHouse server ping failed', error);
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
    if (!this._client) {
      throw new Error('Query failed: ClickHouse client not initialized');
    }

    const resultSet = await this._client.query({
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
    if (!this._client) {
      return;
    }

    await this._client.insert({
      table,
      values,
      format: 'JSONEachRow',
    });
  }

  public async exec({ query, params }: { query: string; params?: Record<string, unknown> }): Promise<void> {
    if (!this._client) {
      return;
    }

    await this._client.exec({
      query,
      query_params: params,
    });
  }
}
