import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import PQueue from 'p-queue';
import { ClickHouseService, InsertOptions } from './clickhouse.service';

type Row = Record<string, unknown>;

interface BatchConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  insertOptions?: InsertOptions;
  maxQueueDepth?: number;
  backpressureMode?: 'drop' | 'block';
  maxRetries?: number;
  retryDelayMs?: number;
}

interface BufferMetrics {
  totalAdded: number;
  totalFlushed: number;
  totalDropped: number;
  totalFailed: number;
}

interface TableBuffer {
  rows: Row[];
  config: BatchConfig;
  timer: NodeJS.Timeout;
  flushQueue: PQueue;
  metrics: BufferMetrics;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_QUEUE_CONCURRENCY = 1;
const DEFAULT_MAX_QUEUE_DEPTH = 10000;
const DEFAULT_BACKPRESSURE_MODE: 'drop' | 'block' = 'drop';

/**
 * Batches and flushes rows to ClickHouse with concurrent write safety.
 *
 * Core Design:
 * - Each table maintains a single-threaded queue (concurrency: 1) for flush operations
 * - Buffer modifications (adding rows, swapping batches) are synchronous and atomic in single-threaded JS
 * - The flushQueue serializes network I/O to ClickHouse to prevent duplicate inserts
 *
 * Concurrent Flow:
 * - Multiple add() calls can arrive concurrently and perform synchronous buffer pushes
 * - When flushing, the buffer is atomically swapped (old batch out, fresh buffer in)
 * - New rows accumulate in the fresh buffer while the old batch is being sent to ClickHouse
 * - This allows continuous writes without blocking on network I/O
 *
 * Batching Triggers:
 * - Size-based: Flush when buffer reaches maxBatchSize
 * - Time-based: Periodic flush every flushIntervalMs
 * - Manual: Explicit flush() calls
 *
 * Backpressure Protection:
 * - Tracks buffer size to enforce maxQueueDepth
 * - When maxQueueDepth is exceeded:
 *   - 'drop' mode (default): Rejects new rows to prevent memory overflow
 *   - 'block' mode: Awaits flush completion before accepting new rows
 */
@Injectable()
export class ClickHouseBatchService implements OnModuleDestroy, OnModuleInit {
  private buffers: Map<string, TableBuffer> = new Map();
  private isShuttingDown = false;

  constructor(
    private readonly clickhouseService: ClickHouseService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(ClickHouseBatchService.name);
  }

  async onModuleInit(): Promise<void> {
    this.logger.debug('ClickHouse batch service initialized');
  }

  async add<T extends Record<string, unknown>>(table: string, row: T, config: BatchConfig): Promise<void> {
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

    const backpressureMode = config.backpressureMode ?? DEFAULT_BACKPRESSURE_MODE;
    const maxQueueDepth = config.maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH;

    if (buffer.rows.length >= maxQueueDepth) {
      if (backpressureMode === 'drop') {
        buffer.metrics.totalDropped++;
        this.logger.warn(
          {
            table,
            bufferSize: buffer.rows.length,
            maxQueueDepth,
            totalDropped: buffer.metrics.totalDropped,
          },
          'Backpressure limit reached, dropping row'
        );

        return;
      }

      await buffer.flushQueue.onIdle();
    }

    buffer.rows.push(row);
    buffer.metrics.totalAdded++;

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
      void this.enqueueFlush(table);
    }
  }

  private initializeBuffer(table: string, config: BatchConfig): TableBuffer {
    const timer = setInterval(() => {
      this.logger.debug({ table }, 'Flush interval reached, triggering flush');
      void this.flush(table);
    }, config.flushIntervalMs);

    const flushQueue = this.createQueue();

    const metrics: BufferMetrics = {
      totalAdded: 0,
      totalFlushed: 0,
      totalDropped: 0,
      totalFailed: 0,
    };

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
      flushQueue,
      metrics,
    };
  }

  private createQueue(): PQueue {
    return new PQueue({ concurrency: DEFAULT_QUEUE_CONCURRENCY });
  }

  async flush(table?: string): Promise<void> {
    if (table) {
      await this.enqueueFlush(table);
    } else {
      await this.flushAll();
    }
  }

  private async enqueueFlush(table: string): Promise<void> {
    const buffer = this.buffers.get(table);

    if (!buffer) {
      return;
    }

    await buffer.flushQueue.add(() => this.flushTable(table));
  }

  private async flushTable(table: string): Promise<void> {
    const buffer = this.buffers.get(table);

    if (!buffer || buffer.rows.length === 0) {
      return;
    }

    const batchToFlush = buffer.rows;
    buffer.rows = [];

    const maxRetries = buffer.config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryDelayMs = buffer.config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    try {
      await this.flushBatchWithRetry(table, batchToFlush, buffer.config.insertOptions, maxRetries, retryDelayMs);

      buffer.metrics.totalFlushed += batchToFlush.length;

      this.logger.debug(
        {
          table,
          rowCount: batchToFlush.length,
          totalFlushed: buffer.metrics.totalFlushed,
        },
        'Successfully flushed batch to ClickHouse'
      );
    } catch (error) {
      buffer.metrics.totalFailed += batchToFlush.length;

      this.logger.error(
        {
          err: error,
          table,
          rowCount: batchToFlush.length,
          totalFailed: buffer.metrics.totalFailed,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to flush batch to ClickHouse after retries'
      );

      if (!this.isShuttingDown) {
        buffer.rows.unshift(...batchToFlush);

        this.logger.warn(
          {
            table,
            rowCount: batchToFlush.length,
            bufferSize: buffer.rows.length,
          },
          'Re-queued failed batch back into buffer'
        );
      }
    }
  }

  private async flushBatchWithRetry(
    table: string,
    batch: Row[],
    insertOptions?: InsertOptions,
    maxRetries: number = DEFAULT_MAX_RETRIES,
    baseRetryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
    retryCount = 0
  ): Promise<void> {
    try {
      await this.clickhouseService.insert(table, batch, insertOptions);
    } catch (error) {
      if (retryCount < maxRetries) {
        const delay = baseRetryDelayMs * 2 ** retryCount;
        this.logger.warn(
          {
            table,
            retryCount: retryCount + 1,
            maxRetries,
            delayMs: delay,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Retrying batch flush after failure'
        );

        await this.sleep(delay);
        return this.flushBatchWithRetry(table, batch, insertOptions, maxRetries, baseRetryDelayMs, retryCount + 1);
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

    await Promise.allSettled(tables.map((table) => this.enqueueFlush(table)));
  }

  private async waitForAllQueues(): Promise<void> {
    const buffers = Array.from(this.buffers.values());
    await Promise.all(buffers.map((buffer) => buffer.flushQueue.onIdle()));
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    this.logger.info('Starting graceful shutdown of ClickHouse batch service');

    for (const [table, buffer] of this.buffers.entries()) {
      clearInterval(buffer.timer);
      this.logger.debug({ table }, 'Cleared flush timer for table');
    }

    await this.flushAll();
    await this.waitForAllQueues();

    this.buffers.clear();

    this.logger.info('ClickHouse batch service shutdown complete');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getBufferStats(): Array<{
    table: string;
    bufferSize: number;
    maxBatchSize: number;
    flushQueueSize: number;
    flushQueuePending: number;
    metrics: BufferMetrics;
  }> {
    return Array.from(this.buffers.entries()).map(([table, buffer]) => ({
      table,
      bufferSize: buffer.rows.length,
      maxBatchSize: buffer.config.maxBatchSize,
      flushQueueSize: buffer.flushQueue.size,
      flushQueuePending: buffer.flushQueue.pending,
      metrics: { ...buffer.metrics },
    }));
  }
}
