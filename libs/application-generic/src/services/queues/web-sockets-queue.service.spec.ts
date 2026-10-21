import { Queue as QueueMock } from 'bullmq';
import { restoreQueueBackendEnv } from '../../config/queue-backend.test-helpers';
import {
  createInMemoryProviderStub,
  createPinoLoggerMock,
  createSocketWorkerServiceMock,
  createSqsServiceMock,
  getLastQueue,
} from '../queue-service-mocks.test-helpers';
import { WebSocketsQueueService } from './web-sockets-queue.service';

vi.mock('bullmq', async (importOriginal) =>
  (await import('../queue-service-mocks.test-helpers')).mockBullmqModule(await importOriginal())
);

const lastQueue = getLastQueue;

function build(isCluster = false) {
  const { provider, client } = createInMemoryProviderStub(isCluster);
  const service = new WebSocketsQueueService(
    provider,
    createSocketWorkerServiceMock(),
    createSqsServiceMock(),
    createPinoLoggerMock()
  );

  return { service, provider, client };
}

function jobDataFor(jobId: string, extra: Record<string, unknown> = {}) {
  return {
    _id: jobId,
    _environmentId: 'web-sockets-queue-environment-id',
    _organizationId: 'web-sockets-queue-organization-id',
    _userId: 'web-sockets-queue-user-id',
    ...extra,
  };
}

describe('WebSockets Queue service', () => {
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
      const { service, client } = build();

      expect(service).toBeDefined();
      expect(Object.keys(service)).toEqual(
        expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'bullMqService', 'queue'])
      );
      expect(service.DEFAULT_ATTEMPTS).toEqual(3);
      expect(service.topic).toEqual('ws_socket_queue');

      expect(QueueMock).toHaveBeenCalledTimes(1);
      expect(QueueMock).toHaveBeenCalledWith('ws_socket_queue', {
        connection: client,
        defaultJobOptions: { removeOnComplete: true },
      });
      expect(vi.mocked(QueueMock).mock.calls[0][1]).not.toHaveProperty('prefix');
      expect(service.queue).toBe(lastQueue());

      expect(await service.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'ws_socket_queue',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await service.isPaused()).toEqual(false);
    });

    it('should add a job in the queue', async () => {
      const { service } = build();
      const jobId = 'web-sockets-queue-job-id';
      const jobData = jobDataFor(jobId);

      await service.add({ name: jobId, data: jobData as any, groupId: 'web-sockets-queue-organization-id' });

      expect(lastQueue().add).toHaveBeenCalledTimes(1);
      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, { removeOnComplete: true, removeOnFail: true });
    });

    it('should add a minimal job in the queue', async () => {
      const { service } = build();
      const jobId = 'web-sockets-queue-job-id-2';
      const jobData = jobDataFor(jobId, { test: 'web-sockets-queue-job-data-2' });

      await service.add({ name: jobId, data: jobData as any, groupId: 'web-sockets-queue-organization-id' });

      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, { removeOnComplete: true, removeOnFail: true });
    });

    it('should never reject when the queue write fails', async () => {
      const { service } = build();
      lastQueue().add.mockRejectedValueOnce(new Error('redis down'));

      await expect(
        service.add({ name: 'ws-failing', data: jobDataFor('ws-failing') as any, groupId: 'org' })
      ).resolves.toBeUndefined();
    });

    it('should delegate readiness to the in-memory provider', () => {
      const { service, provider } = build();

      expect(service.isReady()).toEqual(true);
      expect(provider.isReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cluster mode', () => {
    it('should have prefix in cluster mode', () => {
      build(true);

      expect(QueueMock).toHaveBeenCalledWith(
        'ws_socket_queue',
        expect.objectContaining({ prefix: '{ws_socket_queue}' })
      );
    });
  });
});
