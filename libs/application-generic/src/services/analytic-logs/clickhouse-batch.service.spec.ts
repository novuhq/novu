import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { ClickHouseClient, ClickHouseService } from './clickhouse.service';
import { ClickHouseBatchService } from './clickhouse-batch.service';

type MockClickHouseService = {
  insert: jest.MockedFunction<ClickHouseService['insert']>;
  client: ClickHouseClient | undefined;
};

describe('ClickHouseBatchService', () => {
  let service: ClickHouseBatchService;
  let clickhouseService: MockClickHouseService;
  let logger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    clickhouseService = {
      insert: jest.fn().mockResolvedValue(undefined),
      client: {} as ClickHouseClient,
    };

    logger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickHouseBatchService,
        {
          provide: ClickHouseService,
          useValue: clickhouseService,
        },
        {
          provide: PinoLogger,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<ClickHouseBatchService>(ClickHouseBatchService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('add', () => {
    it('should add row to buffer', async () => {
      const row = { id: '1', data: 'test' };
      const config = { maxBatchSize: 10, flushIntervalMs: 1000 };

      await service.add('test_table', row, config);

      await new Promise((resolve) => setImmediate(resolve));

      const stats = service.getBufferStats();
      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        table: 'test_table',
        bufferSize: 1,
        maxBatchSize: 10,
      });
      expect(stats[0].metrics.totalAdded).toBe(1);
    });

    it('should flush when max batch size is reached', async () => {
      const config = { maxBatchSize: 2, flushIntervalMs: 10000 };

      await service.add('test_table', { id: '1' }, config);
      await service.add('test_table', { id: '2' }, config);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }, { id: '2' }], undefined);
    });

    it('should not add rows during shutdown', async () => {
      service['isShuttingDown'] = true;

      await service.add('test_table', { id: '1' }, { maxBatchSize: 10, flushIntervalMs: 1000 });

      const stats = service.getBufferStats();
      expect(stats).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should not add rows when ClickHouse client is not initialized', async () => {
      clickhouseService.client = undefined;

      await service.add('test_table', { id: '1' }, { maxBatchSize: 10, flushIntervalMs: 1000 });

      const stats = service.getBufferStats();
      expect(stats).toHaveLength(0);
    });

    it('should handle concurrent adds without race conditions', async () => {
      const config = { maxBatchSize: 100, flushIntervalMs: 10000 };
      const concurrentAdds = 50;

      const addPromises = Array.from({ length: concurrentAdds }, (_, i) =>
        service.add('test_table', { id: `${i}` }, config)
      );

      await Promise.all(addPromises);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = service.getBufferStats();
      expect(stats[0].bufferSize).toBe(concurrentAdds);
      expect(stats[0].metrics.totalAdded).toBe(concurrentAdds);
    });

    it('should drop rows when backpressure limit is reached in drop mode', async () => {
      const config = {
        maxBatchSize: 10,
        flushIntervalMs: 10000,
        maxQueueDepth: 5,
        backpressureMode: 'drop' as const,
      };

      clickhouseService.insert.mockImplementation(() => new Promise(() => {}));

      for (let i = 0; i < 10; i++) {
        await service.add('test_table', { id: `${i}` }, config);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = service.getBufferStats();
      expect(stats[0].metrics.totalDropped).toBeGreaterThan(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'test_table',
        }),
        'Backpressure limit reached, dropping row'
      );
    });

    it('should block when backpressure limit is reached in block mode', async () => {
      const config = {
        maxBatchSize: 5,
        flushIntervalMs: 10000,
        maxQueueDepth: 3,
        backpressureMode: 'block' as const,
      };

      let resolveInsert: (() => void) | undefined;
      const insertPromise = new Promise<void>((resolve) => {
        resolveInsert = resolve;
      });

      clickhouseService.insert.mockImplementationOnce(async () => {
        await insertPromise;
      });

      const addPromises = [
        service.add('test_table', { id: '1' }, config),
        service.add('test_table', { id: '2' }, config),
        service.add('test_table', { id: '3' }, config),
      ];

      await new Promise((resolve) => setTimeout(resolve, 50));

      if (resolveInsert) resolveInsert();
      await Promise.all(addPromises);

      const stats = service.getBufferStats();
      expect(stats[0].metrics.totalAdded).toBe(3);
      expect(stats[0].metrics.totalDropped).toBe(0);
    });
  });

  describe('flush', () => {
    it('should flush specific table', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      await service.add('test_table', { id: '1' }, config);
      await service.add('test_table', { id: '2' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }, { id: '2' }], undefined);

      const stats = service.getBufferStats();
      expect(stats[0].bufferSize).toBe(0);
      expect(stats[0].metrics.totalFlushed).toBe(2);
    });

    it('should flush all tables when no table specified', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      await service.add('table1', { id: '1' }, config);
      await service.add('table2', { id: '2' }, config);

      await service.flush();

      expect(clickhouseService.insert).toHaveBeenCalledTimes(2);
      expect(clickhouseService.insert).toHaveBeenCalledWith('table1', [{ id: '1' }], undefined);
      expect(clickhouseService.insert).toHaveBeenCalledWith('table2', [{ id: '2' }], undefined);
    });

    it('should not flush empty buffer', async () => {
      await service.flush('non_existent_table');

      expect(clickhouseService.insert).not.toHaveBeenCalled();
    });

    it('should queue concurrent flush requests and process them sequentially', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      await service.add('test_table', { id: '1' }, config);

      const flushPromise1 = service.flush('test_table');
      const flushPromise2 = service.flush('test_table');

      await Promise.all([flushPromise1, flushPromise2]);

      expect(clickhouseService.insert).toHaveBeenCalledTimes(1);
    });

    it('should process multiple queued flushes when rows are added between flushes', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };
      let resolveFirst: (() => void) | undefined;
      const firstInsertPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      clickhouseService.insert.mockImplementationOnce(async () => {
        await firstInsertPromise;
      });

      await service.add('test_table', { id: '1' }, config);

      const flushPromise1 = service.flush('test_table');
      await service.add('test_table', { id: '2' }, config);
      const flushPromise2 = service.flush('test_table');

      if (resolveFirst) resolveFirst();
      await Promise.all([flushPromise1, flushPromise2]);

      expect(clickhouseService.insert).toHaveBeenCalledTimes(2);
      expect(clickhouseService.insert).toHaveBeenNthCalledWith(1, 'test_table', [{ id: '1' }], undefined);
      expect(clickhouseService.insert).toHaveBeenNthCalledWith(2, 'test_table', [{ id: '2' }], undefined);
    });

    it('should handle concurrent flushes without race conditions', async () => {
      const config = { maxBatchSize: 100, flushIntervalMs: 10000 };

      await service.add('test_table', { id: '1' }, config);
      await service.add('test_table', { id: '2' }, config);

      const flushPromises = Array.from({ length: 5 }, () => service.flush('test_table'));

      await Promise.all(flushPromises);

      expect(clickhouseService.insert).toHaveBeenCalledTimes(1);
      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }, { id: '2' }], undefined);
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      clickhouseService.insert
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      await service.add('test_table', { id: '1' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should log error after max retries', async () => {
      clickhouseService.insert.mockRejectedValue(new Error('Persistent failure'));

      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      await service.add('test_table', { id: '1' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledTimes(4);
      expect(logger.error).toHaveBeenCalled();

      const stats = service.getBufferStats();
      expect(stats[0].metrics.totalFailed).toBe(1);
    });

    it('should respect custom retry configuration', async () => {
      clickhouseService.insert.mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValueOnce(undefined);

      const config = {
        maxBatchSize: 10,
        flushIntervalMs: 10000,
        maxRetries: 1,
        retryDelayMs: 500,
      };

      await service.add('test_table', { id: '1' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('timer-based flush', () => {
    it('should flush on interval', async () => {
      jest.useFakeTimers();

      const config = { maxBatchSize: 10, flushIntervalMs: 1000 };

      await service.add('test_table', { id: '1' }, config);

      jest.advanceTimersByTime(1000);

      await new Promise((resolve) => setImmediate(resolve));

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }], undefined);

      jest.useRealTimers();
    });
  });

  describe('onModuleDestroy', () => {
    it('should flush all buffers and clear timers', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      await service.add('table1', { id: '1' }, config);
      await service.add('table2', { id: '2' }, config);

      await service.onModuleDestroy();

      expect(clickhouseService.insert).toHaveBeenCalledTimes(2);
      expect(service.getBufferStats()).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith('Starting graceful shutdown of ClickHouse batch service');
      expect(logger.info).toHaveBeenCalledWith('ClickHouse batch service shutdown complete');
    });

    it('should set isShuttingDown flag', async () => {
      await service.onModuleDestroy();

      expect(service['isShuttingDown']).toBe(true);
    });

    it('should wait for all queues to complete during shutdown', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      let resolveInsert: (() => void) | undefined;
      const insertPromise = new Promise<void>((resolve) => {
        resolveInsert = resolve;
      });

      clickhouseService.insert.mockImplementationOnce(async () => {
        await insertPromise;
      });

      await service.add('test_table', { id: '1' }, config);
      const flushPromise = service.flush('test_table');

      const destroyPromise = service.onModuleDestroy();

      await new Promise((resolve) => setTimeout(resolve, 50));

      if (resolveInsert) resolveInsert();
      await flushPromise;
      await destroyPromise;

      expect(clickhouseService.insert).toHaveBeenCalled();
      expect(service.getBufferStats()).toHaveLength(0);
    });
  });

  describe('getBufferStats', () => {
    it('should return stats for all buffers including queue stats', async () => {
      const config1 = { maxBatchSize: 10, flushIntervalMs: 1000 };
      const config2 = { maxBatchSize: 20, flushIntervalMs: 2000 };

      await service.add('table1', { id: '1' }, config1);
      await service.add('table1', { id: '2' }, config1);
      await service.add('table2', { id: '3' }, config2);

      await new Promise((resolve) => setImmediate(resolve));

      const stats = service.getBufferStats();

      expect(stats).toHaveLength(2);

      const table1Stats = stats.find((s) => s.table === 'table1');
      expect(table1Stats).toMatchObject({
        table: 'table1',
        bufferSize: 2,
        maxBatchSize: 10,
        writeQueueSize: 0,
        writeQueuePending: 0,
        flushQueueSize: 0,
        flushQueuePending: 0,
      });
      expect(table1Stats?.metrics.totalAdded).toBe(2);

      const table2Stats = stats.find((s) => s.table === 'table2');
      expect(table2Stats).toMatchObject({
        table: 'table2',
        bufferSize: 1,
        maxBatchSize: 20,
        writeQueueSize: 0,
        writeQueuePending: 0,
        flushQueueSize: 0,
        flushQueuePending: 0,
      });
      expect(table2Stats?.metrics.totalAdded).toBe(1);
    });

    it('should include metrics in buffer stats', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      await service.add('test_table', { id: '1' }, config);
      await service.add('test_table', { id: '2' }, config);
      await service.flush('test_table');

      const stats = service.getBufferStats();

      expect(stats[0].metrics).toMatchObject({
        totalAdded: 2,
        totalFlushed: 2,
        totalDropped: 0,
        totalFailed: 0,
      });
    });
  });

  describe('insertOptions', () => {
    it('should pass insertOptions to ClickHouse service', async () => {
      const config = {
        maxBatchSize: 10,
        flushIntervalMs: 10000,
        insertOptions: { asyncInsert: true, waitForAsyncInsert: false },
      };

      await service.add('test_table', { id: '1' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }], {
        asyncInsert: true,
        waitForAsyncInsert: false,
      });
    });
  });

  describe('stress tests', () => {
    it('should handle high concurrency without data loss', async () => {
      const config = { maxBatchSize: 1000, flushIntervalMs: 10000 };
      const totalRows = 200;

      const addPromises = Array.from({ length: totalRows }, (_, i) =>
        service.add('test_table', { id: `${i}` }, config)
      );

      await Promise.all(addPromises);
      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledTimes(1);
      const insertedRows = clickhouseService.insert.mock.calls[0][1];
      expect(insertedRows).toHaveLength(totalRows);

      const uniqueIds = new Set(insertedRows.map((row: any) => row.id));
      expect(uniqueIds.size).toBe(totalRows);
    });

    it('should handle concurrent adds and flushes without race conditions', async () => {
      const config = { maxBatchSize: 5, flushIntervalMs: 10000 };

      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(service.add('test_table', { id: `${i}` }, config));
        if (i % 5 === 0) {
          operations.push(service.flush('test_table'));
        }
      }

      await Promise.all(operations);
      await service.flush('test_table');

      const stats = service.getBufferStats();
      const totalFlushed = stats[0]?.metrics.totalFlushed || 0;
      const totalAdded = stats[0]?.metrics.totalAdded || 0;

      expect(totalAdded).toBe(20);
      expect(totalFlushed).toBeLessThanOrEqual(totalAdded);
    });

    it('should maintain data integrity under concurrent stress', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };
      const tables = ['table1', 'table2', 'table3'];
      const rowsPerTable = 30;

      const operations = [];
      for (const table of tables) {
        for (let i = 0; i < rowsPerTable; i++) {
          operations.push(service.add(table, { id: `${table}-${i}` }, config));
        }
      }

      await Promise.all(operations);
      await service.flush();

      const stats = service.getBufferStats();
      expect(stats).toHaveLength(3);

      for (const tableStat of stats) {
        expect(tableStat.metrics.totalAdded).toBe(rowsPerTable);
        expect(tableStat.metrics.totalFlushed + tableStat.bufferSize).toBe(rowsPerTable);
      }
    });
  });
});
