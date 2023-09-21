import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';

import {
  CompletedJobsMetricQueueService,
  CompletedJobsMetricWorkerService,
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '@novu/application-generic';

import { CompletedJobsMetricService } from './completed-jobs-metric.service';

import { WorkflowModule } from '../workflow.module';

let completedJobsMetricService: CompletedJobsMetricService;
let standardService: StandardQueueService;
let webSocketsQueueService: WebSocketsQueueService;
let workflowQueueService: WorkflowQueueService;
let moduleRef: TestingModule;

before(async () => {
  process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
  process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

  moduleRef = await Test.createTestingModule({
    imports: [WorkflowModule],
  }).compile();

  standardService = moduleRef.get<StandardQueueService>(StandardQueueService);
  webSocketsQueueService = moduleRef.get<WebSocketsQueueService>(WebSocketsQueueService);
  workflowQueueService = moduleRef.get<WorkflowQueueService>(WorkflowQueueService);
});

describe('Completed Jobs Metric Service', () => {
  describe('Environment variables not set', () => {
    beforeEach(() => {
      process.env.NOVU_MANAGED_SERVICE = 'false';
      process.env.NEW_RELIC_LICENSE_KEY = '';

      completedJobsMetricService = new CompletedJobsMetricService([
        standardService,
        webSocketsQueueService,
        workflowQueueService,
      ]);
    });

    it('should not initialize neither the queue or the worker if the environment conditions are not met', async () => {
      expect(completedJobsMetricService).to.be.ok;
      expect(completedJobsMetricService).to.have.all.keys('tokenList');
      expect(await completedJobsMetricService.completedJobsMetricQueueService).to.not.be.ok;
      expect(await completedJobsMetricService.completedJobsMetricWorkerService).to.not.be.ok;
    });
  });

  describe('Environment variables configured', () => {
    beforeEach(async () => {
      process.env.NOVU_MANAGED_SERVICE = 'true';
      process.env.NEW_RELIC_LICENSE_KEY = 'license';

      completedJobsMetricService = new CompletedJobsMetricService([
        standardService,
        webSocketsQueueService,
        workflowQueueService,
      ]);
    });

    after(async () => {
      await completedJobsMetricService.completedJobsMetricQueueService.queue.drain();
      await completedJobsMetricService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(completedJobsMetricService).to.be.ok;
      expect(completedJobsMetricService).to.have.all.keys(
        'completedJobsMetricQueueService',
        'completedJobsMetricWorkerService',
        'tokenList'
      );
      expect(await completedJobsMetricService.completedJobsMetricQueueService.bullMqService.getStatus()).to.deep.equal({
        queueIsPaused: false,
        queueName: 'metric-completed-jobs',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await completedJobsMetricService.completedJobsMetricWorkerService.bullMqService.getStatus()).to.deep.equal(
        {
          queueIsPaused: undefined,
          queueName: undefined,
          workerName: 'metric-completed-jobs',
          workerIsPaused: false,
          workerIsRunning: true,
        }
      );
      expect(completedJobsMetricService.completedJobsMetricWorkerService.worker.opts).to.deep.include({
        concurrency: 1,
        lockDuration: 900,
      });
    });
  });
});
