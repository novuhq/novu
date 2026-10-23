import { Queue as QueueMock } from 'bullmq';
import { restoreQueueBackendEnv } from '../../config/queue-backend.test-helpers';
import {
  createInMemoryProviderStub,
  createPinoLoggerMock,
  createSqsServiceMock,
  getLastQueue,
} from '../queue-service-mocks.test-helpers';
import { WorkflowQueueService } from './workflow-queue.service';

vi.mock('bullmq', async (importOriginal) =>
  (await import('../queue-service-mocks.test-helpers')).mockBullmqModule(await importOriginal())
);

const lastQueue = getLastQueue;

function build(isCluster = false) {
  const { provider, client } = createInMemoryProviderStub(isCluster);
  const service = new WorkflowQueueService(provider, createSqsServiceMock(), createPinoLoggerMock());

  return { service, provider, client };
}

function jobDataFor(jobId: string, extra: Record<string, unknown> = {}) {
  return {
    _id: jobId,
    _environmentId: 'workflow-environment-id',
    _organizationId: 'workflow-organization-id',
    _userId: 'workflow-user-id',
    ...extra,
  };
}

describe('Workflow Queue service', () => {
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
      expect(service.topic).toEqual('trigger-handler');

      expect(QueueMock).toHaveBeenCalledTimes(1);
      expect(QueueMock).toHaveBeenCalledWith('trigger-handler', {
        connection: client,
        defaultJobOptions: { removeOnComplete: true },
      });
      expect(vi.mocked(QueueMock).mock.calls[0][1]).not.toHaveProperty('prefix');
      expect(service.queue).toBe(lastQueue());

      expect(await service.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'trigger-handler',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await service.isPaused()).toEqual(false);
    });

    it('should add a job in the queue', async () => {
      const { service } = build();
      const jobId = 'workflow-job-id';
      const jobData = jobDataFor(jobId);

      await service.add({ name: jobId, data: jobData as any, groupId: 'workflow-organization-id' });

      expect(lastQueue().add).toHaveBeenCalledTimes(1);
      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, { removeOnComplete: true, removeOnFail: true });
    });

    it('should add a minimal job in the queue', async () => {
      const { service } = build();
      const jobId = 'workflow-job-id-2';
      const jobData = jobDataFor(jobId, { test: 'workflow-job-data-2' });

      await service.add({ name: jobId, data: jobData as any, groupId: 'workflow-organization-id' });

      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, { removeOnComplete: true, removeOnFail: true });
    });

    it('should add jobs in bulk', async () => {
      const { service } = build();
      const jobData = jobDataFor('workflow-bulk');

      await service.addBulk([{ name: 'workflow-bulk', data: jobData as any, groupId: 'workflow-organization-id' }]);

      expect(lastQueue().addBulk).toHaveBeenCalledWith([
        { name: 'workflow-bulk', data: jobData, opts: { removeOnComplete: true, removeOnFail: true } },
      ]);
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
        'trigger-handler',
        expect.objectContaining({ prefix: '{trigger-handler}' })
      );
    });
  });
});
