import { Queue as QueueMock } from 'bullmq';
import { restoreQueueBackendEnv } from '../../config/queue-backend.test-helpers';
import { createInMemoryProviderStub, createSqsServiceMock, getLastQueue } from '../queue-service-mocks.test-helpers';
import { INBOUND_PARSE_RETRY_POLICY, InboundParseQueueService } from './inbound-parse-queue.service';

vi.mock('bullmq', async (importOriginal) =>
  (await import('../queue-service-mocks.test-helpers')).mockBullmqModule(await importOriginal())
);

const lastQueue = getLastQueue;

function build(isCluster = false) {
  const { provider, client } = createInMemoryProviderStub(isCluster);
  const service = new InboundParseQueueService(provider, createSqsServiceMock());

  return { service, provider, client };
}

const jobData = {
  html: '<>Hello World</>',
  text: 'text',
  subject: 'subject',
  messageId: '123',
};

describe('Inbound Parse Queue service', () => {
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
      expect(service.topic).toEqual('inbound-parse-mail');

      expect(QueueMock).toHaveBeenCalledTimes(1);
      expect(QueueMock).toHaveBeenCalledWith('inbound-parse-mail', {
        connection: client,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
          attempts: INBOUND_PARSE_RETRY_POLICY.attempts,
          backoff: { delay: INBOUND_PARSE_RETRY_POLICY.backoffBaseMs, type: 'exponential' },
        },
      });
      expect(vi.mocked(QueueMock).mock.calls[0][1]).not.toHaveProperty('prefix');
      expect(service.queue).toBe(lastQueue());

      expect(await service.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'inbound-parse-mail',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await service.isPaused()).toEqual(false);
    });

    it('should add a job in the queue', async () => {
      const { service } = build();
      const jobId = 'inbound-parse-mail-job-id';

      await service.add({ name: jobId, data: jobData as any, groupId: 'inbound-parse-mail-organization-id' });

      expect(lastQueue().add).toHaveBeenCalledTimes(1);
      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, { removeOnComplete: true, removeOnFail: true });
    });

    it('should add a minimal job in the queue', async () => {
      const { service } = build();
      const jobId = 'inbound-parse-mail-job-id-2';

      await service.add({ name: jobId, data: jobData as any, groupId: 'inbound-parse-mail-organization-id' });

      expect(lastQueue().add).toHaveBeenCalledWith(jobId, jobData, { removeOnComplete: true, removeOnFail: true });
    });

    it('should add jobs in bulk with the default removal options', async () => {
      const { service } = build();

      await service.addBulk([{ name: 'a', data: jobData as any, groupId: 'org' }]);

      expect(lastQueue().addBulk).toHaveBeenCalledWith([
        { name: 'a', data: jobData, opts: { removeOnComplete: true, removeOnFail: true } },
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
        'inbound-parse-mail',
        expect.objectContaining({ prefix: '{inbound-parse-mail}' })
      );
    });
  });
});
