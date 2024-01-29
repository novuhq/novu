import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { setTimeout } from 'timers/promises';

import {
  TriggerEvent,
  ExecutionLogQueueService,
  CreateExecutionDetails,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';

import { ExecutionLogWorker } from './execution-log.worker';

import { WorkflowModule } from '../workflow.module';

let executionLogQueueService: ExecutionLogQueueService;
let executionLogWorker: ExecutionLogWorker;

describe('ExecutionLog Worker', () => {
  before(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();

    const createExecutionDetails = moduleRef.get<CreateExecutionDetails>(CreateExecutionDetails);
    const workflowInMemoryProviderService = moduleRef.get<WorkflowInMemoryProviderService>(
      WorkflowInMemoryProviderService
    );

    executionLogWorker = new ExecutionLogWorker(createExecutionDetails, workflowInMemoryProviderService);

    executionLogQueueService = new ExecutionLogQueueService(workflowInMemoryProviderService);
    await executionLogQueueService.queue.obliterate();
  });

  after(async () => {
    await executionLogQueueService.queue.drain();
    await executionLogWorker.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(executionLogWorker).to.be.ok;
    expect(await executionLogWorker.bullMqService.getStatus()).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'execution-logs',
      workerIsPaused: false,
      workerIsRunning: true,
    });
    expect(executionLogWorker.worker.opts).to.deep.include({
      concurrency: 200,
      lockDuration: 90000,
    });
  });

  it('should be able to automatically pull a job from the queue', async () => {
    const existingJobs = await executionLogQueueService.queue.getJobs();
    expect(existingJobs.length).to.equal(0);

    const jobId = 'execution-logs-queue-job-id';
    const _environmentId = 'execution-logs-queue-environment-id';
    const _organizationId = 'execution-logs-queue-organization-id';
    const _userId = 'execution-logs-queue-user-id';
    const jobData = {
      _id: jobId,
      test: 'execution-logs-queue-job-data',
      _environmentId,
      _organizationId,
      _userId,
    } as any;

    await executionLogQueueService.add({ name: jobId, data: jobData, groupId: _organizationId });

    expect(await executionLogQueueService.queue.getActiveCount()).to.equal(1);
    expect(await executionLogQueueService.queue.getWaitingCount()).to.equal(0);

    // When we arrive to pull the job it has been already pulled by the worker
    const nextJob = await executionLogWorker.worker.getNextJob(jobId);
    expect(nextJob).to.equal(undefined);

    await setTimeout(100);

    // No jobs left in queue
    const queueJobs = await executionLogQueueService.queue.getJobs();
    expect(queueJobs.length).to.equal(0);
  });

  it('should pause the worker', async () => {
    const isPaused = await executionLogWorker.worker.isPaused();
    expect(isPaused).to.equal(false);

    const runningStatus = await executionLogWorker.bullMqService.getStatus();
    expect(runningStatus).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'execution-logs',
      workerIsPaused: false,
      workerIsRunning: true,
    });

    await executionLogWorker.pause();

    const isNowPaused = await executionLogWorker.worker.isPaused();
    expect(isNowPaused).to.equal(true);

    const runningStatusChanged = await executionLogWorker.bullMqService.getStatus();
    expect(runningStatusChanged).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'execution-logs',
      workerIsPaused: true,
      workerIsRunning: true,
    });
  });

  it('should resume the worker', async () => {
    await executionLogWorker.pause();

    const isPaused = await executionLogWorker.worker.isPaused();
    expect(isPaused).to.equal(true);

    const runningStatus = await executionLogWorker.bullMqService.getStatus();
    expect(runningStatus).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'execution-logs',
      workerIsPaused: true,
      workerIsRunning: true,
    });

    await executionLogWorker.resume();

    const isNowPaused = await executionLogWorker.worker.isPaused();
    expect(isNowPaused).to.equal(false);

    const runningStatusChanged = await executionLogWorker.bullMqService.getStatus();
    expect(runningStatusChanged).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'execution-logs',
      workerIsPaused: false,
      workerIsRunning: true,
    });
  });
});
