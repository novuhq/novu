import {
  BullMqService,
  QueueBaseOptions,
  WorkerOptions,
} from './bull-mq.service';

let bullMqService: BullMqService;

describe('BullMQ Service', () => {
  describe('Non cluster mode', () => {
    beforeEach(() => {
      bullMqService = new BullMqService();
    });

    afterEach(async () => {
      await bullMqService.gracefulShutdown();
    });

    describe('Set up', () => {
      it('should be able to instantiate it correctly', async () => {
        expect(bullMqService.queue).toBeUndefined();
        expect(bullMqService.worker).toBeUndefined();
        expect(BullMqService.haveProInstalled()).toBeFalsy();
        expect(await bullMqService.getRunningStatus()).toEqual({
          queueIsPaused: undefined,
          queueName: undefined,
          workerIsRunning: undefined,
          workerName: undefined,
        });
      });

      it('should create a queue properly with the default configuration', async () => {
        const queueName = 'test-queue';
        const queueOptions: QueueBaseOptions = {};
        await bullMqService.createQueue(queueName, queueOptions);

        expect(bullMqService.queue.name).toEqual(queueName);
        expect(bullMqService.queue.opts.connection).toEqual({
          connectTimeout: 50000,
          db: 1,
          family: 4,
          host: 'localhost',
          keepAlive: 30000,
          keyPrefix: '',
          password: undefined,
          port: 6379,
          tls: undefined,
        });

        expect(await bullMqService.getRunningStatus()).toEqual({
          queueIsPaused: false,
          queueName,
          workerIsRunning: undefined,
          workerName: undefined,
        });
      });

      it('should create a queue properly with a chosen configuration', async () => {
        const queueName = 'test-queue';
        const queueOptions: QueueBaseOptions = {
          connection: {
            connectTimeout: 10000,
            db: 10,
            family: 6,
            keepAlive: 1000,
            keyPrefix: 'test',
          },
        };
        await bullMqService.createQueue(queueName, queueOptions);

        expect(bullMqService.queue.name).toEqual(queueName);
        expect(bullMqService.queue.opts.connection).toEqual({
          connectTimeout: 10000,
          db: 10,
          family: 6,
          host: 'localhost',
          keepAlive: 1000,
          keyPrefix: 'test',
          password: undefined,
          port: 6379,
          tls: undefined,
        });

        expect(await bullMqService.getRunningStatus()).toEqual({
          queueIsPaused: false,
          queueName,
          workerIsRunning: undefined,
          workerName: undefined,
        });
      });

      it('should create a worker properly with the default configuration', async () => {
        const workerName = 'test-worker';
        await bullMqService.createWorker(workerName, undefined, {});

        expect(bullMqService.worker.name).toEqual(workerName);
        expect(bullMqService.worker.opts.connection).toEqual({
          connectTimeout: 50000,
          db: 1,
          family: 4,
          host: 'localhost',
          keepAlive: 30000,
          keyPrefix: '',
          password: undefined,
          port: 6379,
          tls: undefined,
        });

        expect(await bullMqService.getRunningStatus()).toEqual({
          queueIsPaused: undefined,
          queueName: undefined,
          workerIsRunning: false,
          workerName,
        });
      });

      it('should create a worker properly with a chosen configuration', async () => {
        const workerName = 'test-worker';
        const workerOptions: WorkerOptions = {
          connection: {
            connectTimeout: 10000,
            db: 10,
            family: 6,
            keepAlive: 1000,
            keyPrefix: 'test',
          },
          lockDuration: 90000,
          concurrency: 200,
        };
        await bullMqService.createWorker(workerName, undefined, workerOptions);

        expect(bullMqService.worker.name).toEqual(workerName);
        /*
         * TODO: This test if executed shows we have a bug. As we are not running this
         * in the CI is not going to block. I am fixing it in MemoryDB feature.
         */
        expect(bullMqService.worker.opts.connection).toEqual({
          connectTimeout: 10000,
          db: 10,
          family: 6,
          host: 'localhost',
          keepAlive: 1000,
          keyPrefix: 'test',
          password: undefined,
          port: 6379,
          tls: undefined,
        });
        expect(bullMqService.worker.opts.concurrency).toEqual(200);
        expect(bullMqService.worker.opts.lockDuration).toEqual(90000);

        expect(await bullMqService.getRunningStatus()).toEqual({
          queueIsPaused: undefined,
          queueName: undefined,
          workerIsRunning: false,
          workerName,
        });
      });
    });
  });
});
