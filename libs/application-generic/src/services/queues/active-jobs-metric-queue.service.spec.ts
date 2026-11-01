import { Queue as QueueMock } from 'bullmq';
import { restoreQueueBackendEnv } from '../../config/queue-backend.test-helpers';
import { createInMemoryProviderStub, getLastQueue } from '../queue-service-mocks.test-helpers';
import { ActiveJobsMetricQueueService } from './active-jobs-metric-queue.service';

vi.mock('bullmq', async (importOriginal) =>
  (await import('../queue-service-mocks.test-helpers')).mockBullmqModule(await importOriginal())
);

const lastQueue = getLastQueue;

describe('Job metrics Queue service', () => {
  const restoreEnv = restoreQueueBackendEnv();

  beforeEach(() => {
    delete process.env.QUEUE_BACKEND;
    vi.mocked(QueueMock).mockClear();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('General', () => {
    it('should be initialised properly', async () => {
      const { provider, client } = createInMemoryProviderStub();
      const service = new ActiveJobsMetricQueueService(provider);

      expect(service).toBeDefined();
      expect(Object.keys(service)).toEqual(
        expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'bullMqService', 'queue'])
      );
      expect(service.DEFAULT_ATTEMPTS).toEqual(3);
      expect(service.topic).toEqual('metric-active-jobs');

      expect(QueueMock).toHaveBeenCalledTimes(1);
      expect(QueueMock).toHaveBeenCalledWith('metric-active-jobs', {
        connection: client,
        defaultJobOptions: { removeOnComplete: true },
      });
      expect(service.queue).toBe(lastQueue());

      expect(await service.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'metric-active-jobs',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await service.isPaused()).toEqual(false);
    });

    it('should not set a prefix outside cluster mode', () => {
      new ActiveJobsMetricQueueService(createInMemoryProviderStub(false).provider);

      expect(vi.mocked(QueueMock).mock.calls[0][1]).not.toHaveProperty('prefix');
    });

    it('should delegate readiness to the in-memory provider', () => {
      const { provider } = createInMemoryProviderStub();
      const service = new ActiveJobsMetricQueueService(provider);

      expect(service.isReady()).toEqual(true);
      expect(provider.isReady).toHaveBeenCalledTimes(1);
    });

    it('should close the queue on shutdown', async () => {
      const service = new ActiveJobsMetricQueueService(createInMemoryProviderStub().provider);
      const queue = lastQueue();

      await service.gracefulShutdown();

      expect(queue.close).toHaveBeenCalledTimes(1);
      expect(service.queue).toBeUndefined();
    });
  });

  describe('Cluster mode', () => {
    it('should have prefix in cluster mode', () => {
      new ActiveJobsMetricQueueService(createInMemoryProviderStub(true).provider);

      expect(QueueMock).toHaveBeenCalledWith(
        'metric-active-jobs',
        expect.objectContaining({ prefix: '{metric-active-jobs}' })
      );
    });
  });
});
