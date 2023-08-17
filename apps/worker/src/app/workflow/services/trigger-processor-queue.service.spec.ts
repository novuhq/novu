import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { setTimeout } from 'timers/promises';

import { TriggerProcessorQueueService } from './trigger-processor-queue.service';

import { WorkflowModule } from '../workflow.module';

let triggerProcessorQueueService: TriggerProcessorQueueService;

describe('Trigger Processor Queue service', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();

    triggerProcessorQueueService = moduleRef.get<TriggerProcessorQueueService>(TriggerProcessorQueueService);
    await triggerProcessorQueueService.bullMqService.queue.obliterate();
  });

  afterEach(async () => {
    await triggerProcessorQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(triggerProcessorQueueService).to.be.ok;
    expect(triggerProcessorQueueService).to.have.all.keys('bullMqService', 'name', 'triggerEventUsecase');
    expect(await triggerProcessorQueueService.bullMqService.getRunningStatus()).to.deep.equal({
      queueIsPaused: false,
      queueName: 'trigger-handler',
      workerName: 'trigger-handler',
      workerIsRunning: true,
    });
    expect(triggerProcessorQueueService.bullMqService.worker.opts).to.deep.include({
      concurrency: 200,
      lockDuration: 90000,
    });
    expect(triggerProcessorQueueService.bullMqService.worker.opts.connection).to.deep.include({
      host: 'localhost',
      port: 6379,
    });
  });

  it('should be able to automatically pull a job from the queue that will error', async () => {
    const existingJobs = await triggerProcessorQueueService.bullMqService.queue.getJobs();
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

    await triggerProcessorQueueService.bullMqService.add(jobId, jobData, _organizationId);

    expect(await triggerProcessorQueueService.bullMqService.queue.getActiveCount()).to.equal(1);
    expect(await triggerProcessorQueueService.bullMqService.queue.getWaitingCount()).to.equal(0);

    const timestamp = Date.now();

    // When we arrive to pull the job it has been already pulled by the worker
    const nextJob = await triggerProcessorQueueService.bullMqService.worker.getNextJob(jobId);
    expect(nextJob).to.equal(undefined);

    await setTimeout(100);

    const queueJobs = await triggerProcessorQueueService.bullMqService.queue.getJobs();
    expect(queueJobs.length).to.equal(1);
    const [queueJob] = queueJobs;

    expect(queueJob).to.deep.include({
      attemptsMade: 1,
      data: jobData,
      delay: 0,
      failedReason: 'Notification template could not be found',
      id: '1',
      name: jobId,
      progress: 0,
    });
    const [stackTrace] = queueJob.stacktrace;
    expect(stackTrace)
      .to.be.a('string')
      .and.satisfy((str) => str.startsWith('ApiException: Notification template could not be found'));
    expect(timestamp).to.be.greaterThanOrEqual(Number(queueJob.processedOn));
  });
});
