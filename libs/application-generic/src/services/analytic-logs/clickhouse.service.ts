import { ClickHouseClient, ClickHouseSettings, createClient, PingResult } from '@clickhouse/client';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

export { ClickHouseClient };

export type InsertOptions = {
  asyncInsert?: boolean;
  waitForAsyncInsert?: boolean;
};

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
  private _client: ClickHouseClient | undefined;

  async init() {
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
          query: `CREATE DATABASE IF NOT EXISTS \`${process.env.CLICK_HOUSE_DATABASE}\``,
        });
        console.log(`Database "${process.env.CLICK_HOUSE_DATABASE}" ensured.`);
      } catch (error) {
        console.error(`Failed to create database ${process.env.CLICK_HOUSE_DATABASE}:`, error);
      }
    }

    this._client = createClient({
      url: process.env.CLICK_HOUSE_URL,
      username: process.env.CLICK_HOUSE_USER,
      password: process.env.CLICK_HOUSE_PASSWORD,
      database: process.env.CLICK_HOUSE_DATABASE,
      max_open_connections: process.env.CLICK_HOUSE_MAX_OPEN_CONNECTIONS
        ? parseInt(process.env.CLICK_HOUSE_MAX_OPEN_CONNECTIONS, 10)
        : 10,
    });
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

  public async insert<T extends Record<string, unknown>>(
    table: string,
    values: T[],
    clickhouseSettings?: InsertOptions
  ) {
    if (!this._client) {
      return;
    }

    const settings: ClickHouseSettings = {};
    if (clickhouseSettings?.asyncInsert !== undefined) {
      settings.async_insert = clickhouseSettings.asyncInsert ? 1 : 0;
    }
    if (clickhouseSettings?.waitForAsyncInsert !== undefined) {
      settings.wait_for_async_insert = clickhouseSettings.waitForAsyncInsert ? 1 : 0;
    }

    await this._client.insert({
      table,
      values,
      format: 'JSONEachRow',
      clickhouse_settings: settings,
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
