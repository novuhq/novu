import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { setTimeout } from 'timers/promises';

import { TriggerEvent, WorkflowQueueService } from '@novu/application-generic';

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
    workflowWorker = new WorkflowWorker(triggerEventUseCase);

    workflowQueueService = new WorkflowQueueService();
    await workflowQueueService.queue.obliterate();
  });

  after(async () => {
    await workflowQueueService.queue.drain();
    await workflowWorker.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(workflowWorker).to.be.ok;
    expect(workflowWorker).to.have.all.keys('DEFAULT_ATTEMPTS', 'instance', 'topic', 'triggerEventUsecase', 'worker');
    expect(await workflowWorker.bullMqService.getRunningStatus()).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'trigger-handler',
      workerIsRunning: true,
    });
    expect(workflowWorker.worker.opts).to.deep.include({
      concurrency: 200,
      lockDuration: 90000,
    });
    expect(workflowWorker.worker.opts.connection).to.deep.include({
      host: 'localhost',
      port: 6379,
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
    };

    await workflowQueueService.add(jobId, jobData, _organizationId);

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
});
