import { Queue as QueueMock } from 'bullmq';
import { restoreQueueBackendEnv } from '../../config/queue-backend.test-helpers';
import {
  createInMemoryProviderStub,
  createPinoLoggerMock,
  createSchedulerServiceMock,
  createSqsServiceMock,
  getLastQueue,
} from '../queue-service-mocks.test-helpers';
import { StandardQueueService } from './standard-queue.service';

vi.mock('bullmq', async (importOriginal) =>
  (await import('../queue-service-mocks.test-helpers')).mockBullmqModule(await importOriginal())
);

const lastQueue = getLastQueue;

const ORGANIZATION_ID = 'standard-organization-id';

function build(isCluster = false) {
  const { provider, client } = createInMemoryProviderStub(isCluster);
  const service = new StandardQueueService(
    provider,
    createSqsServiceMock(),
    createPinoLoggerMock(),
    createSchedulerServiceMock()
  );

  return { service, provider, client };
}

function jobDataFor(jobId: string, extra: Record<string, unknown> = {}) {
  return {
    _id: jobId,
    _environmentId: 'standard-environment-id',
    _organizationId: ORGANIZATION_ID,
    _userId: 'standard-user-id',
    ...extra,
  };
}

describe('Standard Queue service', () => {
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
      expect(Object.keys(service)).toEqual(expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'queue']));
      expect(service.DEFAULT_ATTEMPTS).toEqual(3);
      expect(service.topic).toEqual('standard');

      expect(QueueMock).toHaveBeenCalledTimes(1);
      expect(QueueMock).toHaveBeenCalledWith('standard', {
        connection: client,
        defaultJobOptions: { removeOnComplete: true },
      });
      expect(vi.mocked(QueueMock).mock.calls[0][1]).not.toHaveProperty('prefix');
      expect(service.queue).toBe(lastQueue());

      expect(await service.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'standard',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await service.isPaused()).toEqual(false);
    });

    it('should add a job in the queue', async () => {
      const { service } = build();
      const jobId = 'standard-job-id';
      const jobData = jobDataFor(jobId, { test: 'standard-job-data' });

      await service.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });

      expect(lastQueue().add).toHaveBeenCalledTimes(1);
      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, {
        removeOnComplete: true,
        removeOnFail: true,
        jobId,
      });
    });

    it('should add a minimal job in the queue', async () => {
      const { service } = build();
      const jobId = 'standard-job-id-2';
      const jobData = jobDataFor(jobId, { test: 'standard-job-data-2' });

      await service.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });

      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, {
        removeOnComplete: true,
        removeOnFail: true,
        jobId,
      });
    });

    it('should not add the same job twice', async () => {
      const { service } = build();
      const jobId = 'standard-job-id-duplicated';
      const jobData = jobDataFor(jobId);

      await service.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });
      await service.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });

      /*
       * BullMQ is what drops the repeat, keyed on the job id. What this service owns is
       * defaulting that id to the job name, so both inserts carry the same one.
       */
      const { calls } = lastQueue().add.mock;
      expect(calls).toHaveLength(2);
      expect(calls.map(([, , options]) => options.jobId)).toEqual([jobId, jobId]);
    });

    it('should honour a job id provided by the caller', async () => {
      const { service } = build();
      const jobId = 'standard-job-id-with-custom-id';
      const customJobId = `${jobId}-ext1`;
      const jobData = jobDataFor(jobId);

      await service.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });
      await service.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID, options: { jobId: customJobId } });

      const { calls } = lastQueue().add.mock;
      expect(calls.map(([, , options]) => options.jobId)).toEqual([jobId, customJobId]);
    });

    it('should add jobs in bulk', async () => {
      const { service } = build();
      const jobData = jobDataFor('standard-bulk');

      await service.addBulk([{ name: 'standard-bulk', data: jobData, groupId: ORGANIZATION_ID }]);

      expect(lastQueue().addBulk).toHaveBeenCalledWith([
        { name: 'standard-bulk', data: jobData, opts: { removeOnComplete: true, removeOnFail: true } },
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

      expect(QueueMock).toHaveBeenCalledWith('standard', expect.objectContaining({ prefix: '{standard}' }));
    });
  });
});
