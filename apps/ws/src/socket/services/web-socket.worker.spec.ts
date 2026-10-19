import { Test } from '@nestjs/testing';
import {
  FeatureFlagsService,
  IWebSocketDataDto,
  PinoLogger,
  SocketWorkerService,
  SqsService,
  WebSocketsQueueService,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import { expect } from 'chai';
import { setTimeout } from 'timers/promises';
import { SocketModule } from '../socket.module';
import { ExternalServicesRoute } from '../usecases/external-services-route';
import { WebSocketWorker } from './web-socket.worker';

let webSocketsQueueService: WebSocketsQueueService;
let webSocketWorker: WebSocketWorker;

// Mock SocketWorkerService
const mockSocketWorkerService = {
  isEnabled: async () => false,
  sendMessage: async () => undefined,
} as any;

const mockSqsService = {
  getQueueUrl: () => undefined,
  getProducer: () => undefined,
  getClient: () => ({}) as any,
  isConfigured: () => false,
  send: async () => {},
  sendBulk: async () => {},
} as unknown as SqsService;

const mockFeatureFlagsService = {
  getFlag: async () => false,
} as unknown as FeatureFlagsService;

const mockOrganizationRepository = {
  findOne: async () => ({ _id: 'mock-org-id', apiServiceLevel: 'free' }),
} as unknown as CommunityOrganizationRepository;

const mockLogger = {
  setContext: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as PinoLogger;

describe('WebSocket Worker', () => {
  before(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [SocketModule],
    }).compile();

    const externalServicesRoute = moduleRef.get<ExternalServicesRoute>(ExternalServicesRoute);
    const workflowInMemoryProviderService = moduleRef.get<WorkflowInMemoryProviderService>(
      WorkflowInMemoryProviderService
    );

    webSocketWorker = new WebSocketWorker(
      externalServicesRoute,
      workflowInMemoryProviderService,
      mockSqsService,
      mockLogger
    );

    webSocketsQueueService = new WebSocketsQueueService(
      workflowInMemoryProviderService,
      mockSocketWorkerService,
      mockSqsService,
      mockFeatureFlagsService,
      mockOrganizationRepository,
      mockLogger
    );
    await webSocketsQueueService.queue.obliterate();
  });

  after(async () => {
    await webSocketsQueueService.queue.drain();
    await webSocketWorker.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(webSocketWorker).to.be.ok;
    expect(await webSocketWorker.bullMqService.getStatus()).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'ws_socket_queue',
      workerIsPaused: false,
      workerIsRunning: true,
    });
    expect(webSocketWorker.bullMqWorker.opts).to.deep.include({
      concurrency: 400,
      lockDuration: 90000,
    });
  });

  it('should be able to automatically pull a job from the queue', async () => {
    const existingJobs = await webSocketsQueueService.queue.getJobs();
    expect(existingJobs.length).to.equal(0);

    const jobId = 'web-socket-queue-job-id';
    const _environmentId = 'web-socket-queue-environment-id';
    const _organizationId = 'web-socket-queue-organization-id';
    const _userId = 'web-socket-queue-user-id';
    const jobData = {
      event: WebSocketEventEnum.RECEIVED,
      _environmentId,
      _organizationId,
      userId: _userId,
    } as IWebSocketDataDto;

    await webSocketsQueueService.add({ name: jobId, data: jobData, groupId: _organizationId });

    expect(await webSocketsQueueService.queue.getActiveCount()).to.equal(1);
    expect(await webSocketsQueueService.queue.getWaitingCount()).to.equal(0);

    // When we arrive to pull the job it has been already pulled by the worker
    const nextJob = await webSocketWorker.bullMqWorker.getNextJob(jobId);
    expect(nextJob).to.equal(undefined);

    await setTimeout(100);

    // No jobs left in queue
    const queueJobs = await webSocketsQueueService.queue.getJobs();
    expect(queueJobs.length).to.equal(0);
  });
});
