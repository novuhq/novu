import { ClickHouseClient, ClickHouseSettings, createClient, PingResult } from '@clickhouse/client';
import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';
import { env } from '../../config/env';

export { ClickHouseClient };

export function isClickHouseConfigured(): boolean {
  return Boolean(env.CLICK_HOUSE_URL && env.CLICK_HOUSE_DATABASE);
}

export type InsertOptions = {
  asyncInsert?: boolean;
  waitForAsyncInsert?: boolean;
};

@Injectable()
export class ClickHouseService implements BeforeApplicationShutdown {
  private _client: ClickHouseClient | undefined;

  async init() {
    if (!isClickHouseConfigured()) {
      /*
       * this.logger.warn(
       *   'ClickHouse client is not initialized due to missing environment configuration. ' +
       *     'Please provide CLICK_HOUSE_URL and CLICK_HOUSE_DATABASE.'
       * );
       */
      this._client = undefined;

      return;
    }

    if (env.NODE_ENV === 'local' || env.NODE_ENV === 'test') {
      const defaultClient = createClient({
        url: 'http://localhost:8123',
        username: 'default',
        password: '',
        database: 'default',
      });

      try {
        await defaultClient.command({
          query: `CREATE DATABASE IF NOT EXISTS \`${env.CLICK_HOUSE_DATABASE}\``,
        });
        if (!env.CI) {
          console.log(`Database "${env.CLICK_HOUSE_DATABASE}" ensured.`);
        }
      } catch (error) {
        console.error(`Failed to create database ${env.CLICK_HOUSE_DATABASE}:`, error);
      }
    }

    this._client = createClient({
      url: env.CLICK_HOUSE_URL,
      username: env.CLICK_HOUSE_USER,
      password: env.CLICK_HOUSE_PASSWORD,
      database: env.CLICK_HOUSE_DATABASE,
      max_open_connections: env.CLICK_HOUSE_MAX_OPEN_CONNECTIONS,
    });
  }

  get client(): ClickHouseClient | undefined {
    return this._client;
  }

  async beforeApplicationShutdown(signal?: string) {
    if (!this._client) {
      return;
    }
    await this._client.close();
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

    await this._client.command({
      query,
      query_params: params,
    });
  }
}
