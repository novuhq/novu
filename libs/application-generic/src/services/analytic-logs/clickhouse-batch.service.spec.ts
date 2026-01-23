import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { ClickHouseService } from './clickhouse.service';
import { ClickHouseBatchService } from './clickhouse-batch.service';

describe('ClickHouseBatchService', () => {
  let service: ClickHouseBatchService;
  let clickhouseService: jest.Mocked<ClickHouseService>;
  let logger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    clickhouseService = {
      insert: jest.fn().mockResolvedValue(undefined),
      client: {} as any,
    } as any;

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
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('add', () => {
    it('should add row to buffer', () => {
      const row = { id: '1', data: 'test' };
      const config = { maxBatchSize: 10, flushIntervalMs: 1000 };

      service.add('test_table', row, config);

      const stats = service.getBufferStats();
      expect(stats).toHaveLength(1);
      expect(stats[0]).toEqual({
        table: 'test_table',
        bufferSize: 1,
        maxBatchSize: 10,
      });
    });

    it('should flush when max batch size is reached', async () => {
      const config = { maxBatchSize: 2, flushIntervalMs: 10000 };

      service.add('test_table', { id: '1' }, config);
      service.add('test_table', { id: '2' }, config);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }, { id: '2' }], undefined);
    });

    it('should not add rows during shutdown', () => {
      service['isShuttingDown'] = true;

      service.add('test_table', { id: '1' }, { maxBatchSize: 10, flushIntervalMs: 1000 });

      const stats = service.getBufferStats();
      expect(stats).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should not add rows when ClickHouse client is not initialized', () => {
      Object.defineProperty(clickhouseService, 'client', {
        get: () => undefined,
        configurable: true,
      });

      service.add('test_table', { id: '1' }, { maxBatchSize: 10, flushIntervalMs: 1000 });

      const stats = service.getBufferStats();
      expect(stats).toHaveLength(0);
    });
  });

  describe('flush', () => {
    it('should flush specific table', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      service.add('test_table', { id: '1' }, config);
      service.add('test_table', { id: '2' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }, { id: '2' }], undefined);

      const stats = service.getBufferStats();
      expect(stats[0].bufferSize).toBe(0);
    });

    it('should flush all tables when no table specified', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      service.add('table1', { id: '1' }, config);
      service.add('table2', { id: '2' }, config);

      await service.flush();

      expect(clickhouseService.insert).toHaveBeenCalledTimes(2);
      expect(clickhouseService.insert).toHaveBeenCalledWith('table1', [{ id: '1' }], undefined);
      expect(clickhouseService.insert).toHaveBeenCalledWith('table2', [{ id: '2' }], undefined);
    });

    it('should not flush empty buffer', async () => {
      await service.flush('non_existent_table');

      expect(clickhouseService.insert).not.toHaveBeenCalled();
    });

    it('should not flush if already flushing', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      service.add('test_table', { id: '1' }, config);

      const flushPromise1 = service.flush('test_table');
      const flushPromise2 = service.flush('test_table');

      await Promise.all([flushPromise1, flushPromise2]);

      expect(clickhouseService.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      clickhouseService.insert
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      service.add('test_table', { id: '1' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should log error after max retries', async () => {
      clickhouseService.insert.mockRejectedValue(new Error('Persistent failure'));

      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      service.add('test_table', { id: '1' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledTimes(4);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('timer-based flush', () => {
    it('should flush on interval', async () => {
      jest.useFakeTimers();

      const config = { maxBatchSize: 10, flushIntervalMs: 1000 };

      service.add('test_table', { id: '1' }, config);

      jest.advanceTimersByTime(1000);

      await new Promise((resolve) => setImmediate(resolve));

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }], undefined);

      jest.useRealTimers();
    });
  });

  describe('onModuleDestroy', () => {
    it('should flush all buffers and clear timers', async () => {
      const config = { maxBatchSize: 10, flushIntervalMs: 10000 };

      service.add('table1', { id: '1' }, config);
      service.add('table2', { id: '2' }, config);

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
  });

  describe('getBufferStats', () => {
    it('should return stats for all buffers', () => {
      const config1 = { maxBatchSize: 10, flushIntervalMs: 1000 };
      const config2 = { maxBatchSize: 20, flushIntervalMs: 2000 };

      service.add('table1', { id: '1' }, config1);
      service.add('table1', { id: '2' }, config1);
      service.add('table2', { id: '3' }, config2);

      const stats = service.getBufferStats();

      expect(stats).toHaveLength(2);
      expect(stats).toContainEqual({
        table: 'table1',
        bufferSize: 2,
        maxBatchSize: 10,
      });
      expect(stats).toContainEqual({
        table: 'table2',
        bufferSize: 1,
        maxBatchSize: 20,
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

      service.add('test_table', { id: '1' }, config);

      await service.flush('test_table');

      expect(clickhouseService.insert).toHaveBeenCalledWith('test_table', [{ id: '1' }], {
        asyncInsert: true,
        waitForAsyncInsert: false,
      });
    });
  });
});
