import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ClickHouseService, InsertOptions } from './clickhouse.service';

type Row = Record<string, unknown>;

interface BatchConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  insertOptions?: InsertOptions;
}

interface TableBuffer {
  rows: Row[];
  config: BatchConfig;
  timer: NodeJS.Timeout;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

@Injectable()
export class ClickHouseBatchService implements OnModuleDestroy {
  private buffers: Map<string, TableBuffer> = new Map();
  private flushing: Map<string, boolean> = new Map();
  private isShuttingDown = false;

  constructor(
    private readonly clickhouseService: ClickHouseService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(ClickHouseBatchService.name);
  }

  add<T extends Record<string, unknown>>(table: string, row: T, config: BatchConfig): void {
    if (this.isShuttingDown) {
      this.logger.warn({ table, rowCount: 1 }, 'Attempted to add row during shutdown, row will be dropped');
      return;
    }

    if (!this.clickhouseService.client) {
      this.logger.debug({ table }, 'ClickHouse client not initialized, skipping batch add');
      return;
    }

    let buffer = this.buffers.get(table);

    if (!buffer) {
      buffer = this.initializeBuffer(table, config);
      this.buffers.set(table, buffer);
    }

    buffer.rows.push(row);

    this.logger.debug(
      {
        table,
        bufferSize: buffer.rows.length,
        maxBatchSize: config.maxBatchSize,
      },
      'Row added to batch buffer'
    );

    if (buffer.rows.length >= config.maxBatchSize) {
      this.logger.debug({ table, bufferSize: buffer.rows.length }, 'Max batch size reached, triggering flush');
      void this.flush(table);
    }
  }

  private initializeBuffer(table: string, config: BatchConfig): TableBuffer {
    const timer = setInterval(() => {
      this.logger.debug({ table }, 'Flush interval reached, triggering flush');
      void this.flush(table);
    }, config.flushIntervalMs);

    this.logger.debug(
      {
        table,
        maxBatchSize: config.maxBatchSize,
        flushIntervalMs: config.flushIntervalMs,
      },
      'Initialized batch buffer for table'
    );

    return {
      rows: [],
      config,
      timer,
    };
  }

  async flush(table?: string): Promise<void> {
    if (table) {
      await this.flushTable(table);
    } else {
      await this.flushAll();
    }
  }

  private async flushTable(table: string): Promise<void> {
    const buffer = this.buffers.get(table);

    if (!buffer || buffer.rows.length === 0) {
      return;
    }

    if (this.flushing.get(table)) {
      this.logger.debug({ table }, 'Flush already in progress for table, skipping');
      return;
    }

    this.flushing.set(table, true);
    const batch = buffer.rows.splice(0, buffer.rows.length);

    try {
      await this.flushBatchWithRetry(table, batch, buffer.config.insertOptions);

      this.logger.debug(
        {
          table,
          rowCount: batch.length,
        },
        'Successfully flushed batch to ClickHouse'
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
          table,
          rowCount: batch.length,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to flush batch to ClickHouse after retries'
      );
    } finally {
      this.flushing.set(table, false);
    }
  }

  private async flushBatchWithRetry(
    table: string,
    batch: Row[],
    insertOptions?: InsertOptions,
    retryCount = 0
  ): Promise<void> {
    try {
      await this.clickhouseService.insert(table, batch, insertOptions);
    } catch (error) {
      if (retryCount < DEFAULT_MAX_RETRIES) {
        const delay = DEFAULT_RETRY_DELAY_MS * 2 ** retryCount;
        this.logger.warn(
          {
            table,
            retryCount: retryCount + 1,
            maxRetries: DEFAULT_MAX_RETRIES,
            delayMs: delay,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Retrying batch flush after failure'
        );

        await this.sleep(delay);
        return this.flushBatchWithRetry(table, batch, insertOptions, retryCount + 1);
      }

      throw error;
    }
  }

  private async flushAll(): Promise<void> {
    const tables = Array.from(this.buffers.keys());

    this.logger.debug(
      {
        tableCount: tables.length,
        tables,
      },
      'Flushing all table buffers'
    );

    await Promise.allSettled(tables.map((table) => this.flushTable(table)));
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    this.logger.info('Starting graceful shutdown of ClickHouse batch service');

    for (const [table, buffer] of this.buffers.entries()) {
      clearInterval(buffer.timer);
      this.logger.debug({ table }, 'Cleared flush timer for table');
    }

    await this.flushAll();

    this.buffers.clear();
    this.flushing.clear();

    this.logger.info('ClickHouse batch service shutdown complete');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getBufferStats(): Array<{ table: string; bufferSize: number; maxBatchSize: number }> {
    return Array.from(this.buffers.entries()).map(([table, buffer]) => ({
      table,
      bufferSize: buffer.rows.length,
      maxBatchSize: buffer.config.maxBatchSize,
    }));
  }
}
