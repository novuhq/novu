import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { setTimeout } from 'timers/promises';

import {
  BullMqService,
  TriggerEvent,
  WorkflowInMemoryProviderService,
  WorkflowQueueService,
} from '@novu/application-generic';

import { WorkflowWorker } from './workflow.worker';

import { WorkflowModule } from '../workflow.module';

let workflowQueueService: WorkflowQueueService;
let workflowWorker: WorkflowWorker;

describe('Workflow Worker', () => {
  before(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();

    const triggerEventUseCase = moduleRef.get<TriggerEvent>(TriggerEvent);
    const workflowInMemoryProviderService = moduleRef.get<WorkflowInMemoryProviderService>(
      WorkflowInMemoryProviderService
    );
    workflowWorker = new WorkflowWorker(triggerEventUseCase, workflowInMemoryProviderService);

    workflowQueueService = new WorkflowQueueService(workflowInMemoryProviderService);
    await workflowQueueService.queue.obliterate();
  });

  after(async () => {
    await workflowQueueService.queue.drain();
    await workflowWorker.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(workflowWorker).to.be.ok;
    expect(await workflowWorker.bullMqService.getStatus()).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'trigger-handler',
      workerIsPaused: false,
      workerIsRunning: true,
    });
    expect(workflowWorker.worker.opts).to.deep.include({
      concurrency: 200,
      lockDuration: 90000,
    });
  });

  it('should be able to automatically pull a job from the queue', async () => {
    const existingJobs = await workflowQueueService.queue.getJobs();
    expect(existingJobs.length).to.equal(0);

    const jobId = 'trigger-processor-queue-job-id';
    const _environmentId = 'trigger-processor-queue-environment-id';
    const _organizationId = 'trigger-processor-queue-organization-id';
    const _userId = 'trigger-processor-queue-user-id';
    const jobData = {
      _id: jobId,
      test: 'trigger-processor-queue-job-data',
      _environmentId,
      _organizationId,
      _userId,
    } as any;

    await workflowQueueService.add({ name: jobId, data: jobData, groupId: _organizationId });

    expect(await workflowQueueService.queue.getActiveCount()).to.equal(1);
    expect(await workflowQueueService.queue.getWaitingCount()).to.equal(0);

    // When we arrive to pull the job it has been already pulled by the worker
    const nextJob = await workflowWorker.worker.getNextJob(jobId);
    expect(nextJob).to.equal(undefined);

    await setTimeout(100);

    // No jobs left in queue
    const queueJobs = await workflowQueueService.queue.getJobs();
    expect(queueJobs.length).to.equal(0);
  });

  it('should pause the worker', async () => {
    const isPaused = await workflowWorker.worker.isPaused();
    expect(isPaused).to.equal(false);

    const runningStatus = await workflowWorker.bullMqService.getStatus();
    expect(runningStatus).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'trigger-handler',
      workerIsPaused: false,
      workerIsRunning: true,
    });

    await workflowWorker.pause();

    const isNowPaused = await workflowWorker.worker.isPaused();
    expect(isNowPaused).to.equal(true);

    const runningStatusChanged = await workflowWorker.bullMqService.getStatus();
    expect(runningStatusChanged).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'trigger-handler',
      workerIsPaused: true,
      workerIsRunning: true,
    });
  });

  it('should resume the worker', async () => {
    await workflowWorker.pause();

    const isPaused = await workflowWorker.worker.isPaused();
    expect(isPaused).to.equal(true);

    const runningStatus = await workflowWorker.bullMqService.getStatus();
    expect(runningStatus).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'trigger-handler',
      workerIsPaused: true,
      workerIsRunning: true,
    });

    await workflowWorker.resume();

    const isNowPaused = await workflowWorker.worker.isPaused();
    expect(isNowPaused).to.equal(false);

    const runningStatusChanged = await workflowWorker.bullMqService.getStatus();
    expect(runningStatusChanged).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'trigger-handler',
      workerIsPaused: false,
      workerIsRunning: true,
    });
  });
});
