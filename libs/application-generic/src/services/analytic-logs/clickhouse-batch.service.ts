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
  writeQueue: PQueue;
  flushQueue: PQueue;
  metrics: BufferMetrics;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_QUEUE_CONCURRENCY = 1;
const DEFAULT_MAX_QUEUE_DEPTH = 10000;
const DEFAULT_BACKPRESSURE_MODE: 'drop' | 'block' = 'drop';

@Injectable()
export class ClickHouseBatchService implements OnModuleDestroy, OnModuleInit {
  private buffers: Map<string, TableBuffer> = new Map();
  private isShuttingDown = false;
  private PQueueClass: typeof PQueue | null = null;
  private pQueueReady: Promise<void>;
  private resolvePQueueReady!: () => void;

  constructor(
    private readonly clickhouseService: ClickHouseService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(ClickHouseBatchService.name);
    this.pQueueReady = new Promise((resolve) => {
      this.resolvePQueueReady = resolve;
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      this.PQueueClass = PQueue;
      this.resolvePQueueReady();
      this.logger.debug('p-queue module loaded successfully');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to load p-queue module');
      this.resolvePQueueReady();
    }
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

    await this.pQueueReady;

    let buffer = this.buffers.get(table);

    if (!buffer) {
      buffer = this.initializeBuffer(table, config);
      this.buffers.set(table, buffer);
    }

    const backpressureMode = config.backpressureMode ?? DEFAULT_BACKPRESSURE_MODE;
    const maxQueueDepth = config.maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH;

    const totalQueued = buffer.writeQueue.size + buffer.writeQueue.pending + buffer.rows.length;

    if (totalQueued >= maxQueueDepth) {
      if (backpressureMode === 'drop') {
        buffer.metrics.totalDropped++;
        this.logger.warn(
          {
            table,
            totalQueued,
            maxQueueDepth,
            totalDropped: buffer.metrics.totalDropped,
          },
          'Backpressure limit reached, dropping row'
        );

        return;
      }
    }

    const addOperation = async () => {
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
    };

    if (backpressureMode === 'block') {
      await buffer.writeQueue.add(addOperation);
    } else {
      void buffer.writeQueue.add(addOperation);
    }
  }

  private initializeBuffer(table: string, config: BatchConfig): TableBuffer {
    const timer = setInterval(() => {
      this.logger.debug({ table }, 'Flush interval reached, triggering flush');
      void this.flush(table);
    }, config.flushIntervalMs);

    const writeQueue = this.createQueue();
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
      writeQueue,
      flushQueue,
      metrics,
    };
  }

  private createQueue(): PQueue {
    if (!this.PQueueClass) {
      throw new Error('p-queue module not loaded');
    }

    return new this.PQueueClass({ concurrency: DEFAULT_QUEUE_CONCURRENCY });
  }

  async flush(table?: string): Promise<void> {
    await this.pQueueReady;

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

    if (!buffer) {
      return;
    }

    const batchToFlush = await buffer.writeQueue.add(async () => {
      if (buffer.rows.length === 0) {
        return null;
      }

      const batch = buffer.rows;
      buffer.rows = [];

      return batch;
    });

    if (!batchToFlush || batchToFlush.length === 0) {
      return;
    }

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
        await buffer.writeQueue.add(async () => {
          buffer.rows.unshift(...batchToFlush);

          this.logger.warn(
            {
              table,
              rowCount: batchToFlush.length,
              bufferSize: buffer.rows.length,
            },
            'Re-queued failed batch back into buffer'
          );
        });
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
    await Promise.all(buffers.flatMap((buffer) => [buffer.writeQueue.onIdle(), buffer.flushQueue.onIdle()]));
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
    writeQueueSize: number;
    writeQueuePending: number;
    flushQueueSize: number;
    flushQueuePending: number;
    metrics: BufferMetrics;
  }> {
    return Array.from(this.buffers.entries()).map(([table, buffer]) => ({
      table,
      bufferSize: buffer.rows.length,
      maxBatchSize: buffer.config.maxBatchSize,
      writeQueueSize: buffer.writeQueue.size,
      writeQueuePending: buffer.writeQueue.pending,
      flushQueueSize: buffer.flushQueue.size,
      flushQueuePending: buffer.flushQueue.pending,
      metrics: { ...buffer.metrics },
    }));
  }
}
