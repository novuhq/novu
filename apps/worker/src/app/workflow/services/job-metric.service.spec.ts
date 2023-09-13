import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import {
  JobMetricsQueueService,
  JobMetricsWorkerService,
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '@novu/application-generic';

import { JobMetricService } from './job-metric.service';

import { WorkflowModule } from '../workflow.module';

let jobMetricService: JobMetricService;

describe('Job Metric Service', () => {
  before(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();

    const standardService = moduleRef.get<StandardQueueService>(StandardQueueService);
    const webSocketsQueueService = moduleRef.get<WebSocketsQueueService>(WebSocketsQueueService);
    const workflowQueueService = moduleRef.get<WorkflowQueueService>(WorkflowQueueService);

    const jobMetricQueueService = new JobMetricsQueueService();
    const jobMetricWorkerService = new JobMetricsWorkerService();

    jobMetricService = new JobMetricService(
      [standardService, webSocketsQueueService, workflowQueueService],
      jobMetricQueueService,
      jobMetricWorkerService
    );
  });

  after(async () => {
    await jobMetricService.jobMetricsQueueService.queue.drain();
    await jobMetricService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(jobMetricService).to.be.ok;
    expect(jobMetricService).to.have.all.keys('jobMetricsQueueService', 'jobMetricsWorkerService', 'tokenList');
    expect(await jobMetricService.jobMetricsQueueService.bullMqService.getStatus()).to.deep.equal({
      queueIsPaused: false,
      queueName: 'metric',
      workerName: undefined,
      workerIsPaused: undefined,
      workerIsRunning: undefined,
    });
    expect(await jobMetricService.jobMetricsWorkerService.bullMqService.getStatus()).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'metric',
      workerIsPaused: false,
      workerIsRunning: true,
    });
    expect(jobMetricService.jobMetricsWorkerService.worker.opts).to.deep.include({
      concurrency: 1,
      lockDuration: 500,
    });

    expect(jobMetricService.jobMetricsWorkerService.worker.opts).to.deep.include({
      concurrency: 1,
      lockDuration: 500,
    });
  });
});
