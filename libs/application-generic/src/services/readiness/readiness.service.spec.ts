import { CommunityOrganizationRepository } from '@novu/dal';
import {
  StandardQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../../health';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { CloudflareSchedulerService } from '../cloudflare-scheduler';
import { FeatureFlagsService } from '../feature-flags';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { StandardQueueService, SubscriberProcessQueueService, WorkflowQueueService } from '../queues';
import { SqsService } from '../sqs';
import { StandardWorkerService, WorkerBaseService } from '../workers';
import { ReadinessService } from './readiness.service';

let readinessService: ReadinessService;
let standardQueueService: StandardQueueService;
let workflowQueueService: WorkflowQueueService;
let subscriberProcessQueueService: SubscriberProcessQueueService;
let testWorker: WorkerBaseService;

const mockCloudflareSchedulerService = {
  scheduleJob: jest.fn(),
} as unknown as CloudflareSchedulerService;

const mockFeatureFlagsService = {
  getFlag: jest.fn(),
} as unknown as FeatureFlagsService;

const mockOrganizationRepository = {
  findOne: jest.fn(),
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

describe('Readiness Service', () => {
  beforeAll(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    standardQueueService = new StandardQueueService(
      new WorkflowInMemoryProviderService(),
      mockCloudflareSchedulerService,
      mockFeatureFlagsService,
      mockOrganizationRepository,
      mockSqsService,
      mockLogger
    );
    workflowQueueService = new WorkflowQueueService(
      new WorkflowInMemoryProviderService(),
      mockSqsService,
      mockFeatureFlagsService,
      mockOrganizationRepository,
      mockLogger
    );
    subscriberProcessQueueService = new SubscriberProcessQueueService(
      new WorkflowInMemoryProviderService(),
      mockSqsService,
      mockFeatureFlagsService,
      mockOrganizationRepository,
      mockLogger
    );

    await Promise.all([
      standardQueueService.workflowInMemoryProviderService.initialize(),
      workflowQueueService.workflowInMemoryProviderService.initialize(),
      subscriberProcessQueueService.workflowInMemoryProviderService.initialize(),
    ]);

    const standardQueueServiceHealthIndicator = new StandardQueueServiceHealthIndicator(standardQueueService);
    const workflowQueueServiceHealthIndicator = new WorkflowQueueServiceHealthIndicator(workflowQueueService);
    const subscriberProcessQueueHealthIndicator = new SubscriberProcessQueueHealthIndicator(
      subscriberProcessQueueService
    );

    readinessService = new ReadinessService([
      standardQueueServiceHealthIndicator,
      workflowQueueServiceHealthIndicator,
      subscriberProcessQueueHealthIndicator,
    ]);
  });

  afterAll(async () => {
    await standardQueueService.gracefulShutdown();
    await workflowQueueService.gracefulShutdown();
    await testWorker?.gracefulShutdown();
  });

  describe('Set up', () => {
    it('should be able to instantiate it correctly', async () => {
      expect(Object.keys(readinessService)).toEqual(
        expect.arrayContaining([
          'standardQueueServiceHealthIndicator',
          'workflowQueueServiceHealthIndicator',
          'subscriberProcessQueueHealthIndicator',
        ])
      );

      const areQueuesEnabled = await readinessService.areQueuesEnabled();
      expect(areQueuesEnabled).toEqual(true);
    });
  });

  describe('Functionalities', () => {
    it('should be able to pause the workers given', async () => {
      const getWorkerOptions = () => {
        return {
          lockDuration: 90000,
          concurrency: 200,
        };
      };

      const getWorkerProcessor = () => {
        return async ({ data }) => {
          return await new Promise((resolve) => {
            resolve(data);
          });
        };
      };

      testWorker = new StandardWorkerService(new BullMqService(new WorkflowInMemoryProviderService()));
      await testWorker.initWorker(getWorkerProcessor(), getWorkerOptions());

      const [initialIsPaused, initialIsRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(initialIsPaused).toEqual(false);
      expect(initialIsRunning).toEqual(true);

      await readinessService.pauseWorkers([testWorker]);

      const [isPaused, isRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(isPaused).toEqual(true);
      expect(isRunning).toEqual(true);
    });

    it('should be able to resume the workers given', async () => {
      const [initialIsPaused, initialIsRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(initialIsPaused).toEqual(true);
      expect(initialIsRunning).toEqual(true);

      await readinessService.enableWorkers([testWorker]);

      const [isPaused, isRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(isPaused).toEqual(false);
      expect(isRunning).toEqual(true);
    });
  });
});
