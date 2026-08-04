import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, QueueBackendMode } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { FeatureFlagsService } from '../feature-flags';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SqsService } from '../sqs';
import { StandardQueueService } from './standard-queue.service';

let standardQueueService: StandardQueueService;

const ORGANIZATION_ID = 'standard-organization-id';

const mockFeatureFlagsService = {
  getFlag: jest.fn().mockResolvedValue(QueueBackendMode.BULLMQ),
} as unknown as FeatureFlagsService;

const mockOrganizationRepository = {
  findOne: jest.fn().mockResolvedValue({ _id: ORGANIZATION_ID, apiServiceLevel: ApiServiceLevelEnum.FREE }),
} as unknown as CommunityOrganizationRepository;

const mockSqsService = {
  getQueueUrl: jest.fn(),
  getProducer: jest.fn(),
  getClient: jest.fn(),
} as unknown as SqsService;

const mockLogger = {
  setContext: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as PinoLogger;

describe('Standard Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      standardQueueService = new StandardQueueService(
        new WorkflowInMemoryProviderService(),
        mockSqsService,
        mockFeatureFlagsService,
        mockOrganizationRepository,
        mockLogger
      );
      await standardQueueService.queue.obliterate();
    });

    beforeEach(async () => {
      await standardQueueService.queue.drain();
    });

    afterAll(async () => {
      await standardQueueService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(standardQueueService).toBeDefined();
      expect(Object.keys(standardQueueService)).toEqual(expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'queue']));
      expect(standardQueueService.DEFAULT_ATTEMPTS).toEqual(3);
      expect(standardQueueService.topic).toEqual('standard');
      expect(await standardQueueService.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'standard',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await standardQueueService.isPaused()).toEqual(false);
      expect(standardQueueService.queue).toMatchObject(
        expect.objectContaining({
          _events: {},
          _eventsCount: 0,
          _maxListeners: undefined,
          name: 'standard',
          jobsOpts: {
            removeOnComplete: true,
          },
        })
      );
      expect(standardQueueService.queue.opts.prefix).toEqual('bull');
    });

    it('should add a job in the queue', async () => {
      const jobId = 'standard-job-id';
      const _environmentId = 'standard-environment-id';
      const _organizationId = 'standard-organization-id';
      const _userId = 'standard-user-id';
      const jobData = {
        _id: jobId,
        test: 'standard-job-data',
        _environmentId,
        _organizationId,
        _userId,
      };

      await standardQueueService.add({
        name: jobId,
        data: jobData,
        groupId: _organizationId,
      });

      expect(await standardQueueService.queue.getActiveCount()).toEqual(0);
      expect(await standardQueueService.queue.getWaitingCount()).toEqual(1);

      const standardQueueJobs = await standardQueueService.queue.getJobs();
      expect(standardQueueJobs.length).toEqual(1);
      const [standardQueueJob] = standardQueueJobs;
      expect(standardQueueJob).toMatchObject(
        expect.objectContaining({
          id: jobId,
          name: jobId,
          data: jobData,
          attemptsMade: 0,
        })
      );
    });

    it('should add a minimal job in the queue', async () => {
      const jobId = 'standard-job-id-2';
      const _environmentId = 'standard-environment-id';
      const _organizationId = 'standard-organization-id';
      const _userId = 'standard-user-id';
      const jobData = {
        _id: jobId,
        test: 'standard-job-data-2',
        _environmentId,
        _organizationId,
        _userId,
      };

      await standardQueueService.add({
        name: jobId,
        data: jobData,
        groupId: _organizationId,
      });

      expect(await standardQueueService.queue.getActiveCount()).toEqual(0);
      expect(await standardQueueService.queue.getWaitingCount()).toEqual(1);

      const standardQueueJobs = await standardQueueService.queue.getJobs();
      expect(standardQueueJobs.length).toEqual(1);
      const [standardQueueJob] = standardQueueJobs;
      expect(standardQueueJob).toMatchObject(
        expect.objectContaining({
          id: jobId,
          name: jobId,
          data: {
            _id: jobId,
            _environmentId,
            _organizationId,
            _userId,
          },
          attemptsMade: 0,
        })
      );
    });

    it('should not add the same job twice', async () => {
      const jobId = 'standard-job-id-duplicated';
      const jobData = {
        _id: jobId,
        _environmentId: 'standard-environment-id',
        _organizationId: ORGANIZATION_ID,
        _userId: 'standard-user-id',
      };

      await standardQueueService.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });
      await standardQueueService.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });

      expect(await standardQueueService.queue.getWaitingCount()).toEqual(1);

      const standardQueueJobs = await standardQueueService.queue.getJobs();
      expect(standardQueueJobs.length).toEqual(1);
      expect(standardQueueJobs[0].id).toEqual(jobId);
    });

    it('should honour a job id provided by the caller', async () => {
      const jobId = 'standard-job-id-with-custom-id';
      const customJobId = `${jobId}-ext1`;
      const jobData = {
        _id: jobId,
        _environmentId: 'standard-environment-id',
        _organizationId: ORGANIZATION_ID,
        _userId: 'standard-user-id',
      };

      await standardQueueService.add({ name: jobId, data: jobData, groupId: ORGANIZATION_ID });
      await standardQueueService.add({
        name: jobId,
        data: jobData,
        groupId: ORGANIZATION_ID,
        options: { jobId: customJobId },
      });

      expect(await standardQueueService.queue.getWaitingCount()).toEqual(2);

      const standardQueueJobs = await standardQueueService.queue.getJobs();
      expect(standardQueueJobs.map((job) => job.id).sort()).toEqual([customJobId, jobId]);
    });
  });

  describe('Cluster mode', () => {
    beforeAll(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      standardQueueService = new StandardQueueService(
        new WorkflowInMemoryProviderService(),
        mockSqsService,
        mockFeatureFlagsService,
        mockOrganizationRepository,
        mockLogger
      );
      await standardQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await standardQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(standardQueueService.queue.opts.prefix).toEqual('{standard}');
    });
  });
});
