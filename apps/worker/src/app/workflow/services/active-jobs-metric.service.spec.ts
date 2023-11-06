import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';

import {
  ActiveJobsMetricQueueService,
  ActiveJobsMetricWorkerService,
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '@novu/application-generic';

import { ActiveJobsMetricService } from './active-jobs-metric.service';

import { WorkflowModule } from '../workflow.module';

let activeJobsMetricService: ActiveJobsMetricService;
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

describe('Active Jobs Metric Service', () => {
  before(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();

    standardService = moduleRef.get<StandardQueueService>(StandardQueueService);
    webSocketsQueueService = moduleRef.get<WebSocketsQueueService>(WebSocketsQueueService);
    workflowQueueService = moduleRef.get<WorkflowQueueService>(WorkflowQueueService);

    const activeJobsMetricQueueService = new ActiveJobsMetricQueueService();
    const activeJobsMetricWorkerService = new ActiveJobsMetricWorkerService();

    activeJobsMetricService = new ActiveJobsMetricService([
      standardService,
      webSocketsQueueService,
      workflowQueueService,
    ]);
  });

  describe('Environment variables not set', () => {
    beforeEach(() => {
      process.env.NOVU_MANAGED_SERVICE = 'false';
      process.env.NEW_RELIC_LICENSE_KEY = '';

      activeJobsMetricService = new ActiveJobsMetricService([
        standardService,
        webSocketsQueueService,
        workflowQueueService,
      ]);
    });

    it('should not initialize neither the queue or the worker if the environment conditions are not met', async () => {
      expect(activeJobsMetricService).to.be.ok;
      expect(activeJobsMetricService).to.have.all.keys('tokenList');
      expect(await activeJobsMetricService.activeJobsMetricQueueService).to.not.be.ok;
      expect(await activeJobsMetricService.activeJobsMetricWorkerService).to.not.be.ok;
    });
  });

  describe('Environment variables configured', () => {
    beforeEach(async () => {
      process.env.NOVU_MANAGED_SERVICE = 'true';
      process.env.NEW_RELIC_LICENSE_KEY = 'license';

      activeJobsMetricService = new ActiveJobsMetricService([
        standardService,
        webSocketsQueueService,
        workflowQueueService,
      ]);
    });

    after(async () => {
      await activeJobsMetricService.activeJobsMetricQueueService.queue.drain();
      await activeJobsMetricService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(activeJobsMetricService).to.be.ok;
      expect(activeJobsMetricService).to.have.all.keys(
        'activeJobsMetricQueueService',
        'activeJobsMetricWorkerService',
        'tokenList'
      );
      expect(await activeJobsMetricService.activeJobsMetricQueueService.bullMqService.getStatus()).to.deep.equal({
        queueIsPaused: false,
        queueName: 'metric-active-jobs',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await activeJobsMetricService.activeJobsMetricWorkerService.bullMqService.getStatus()).to.deep.equal({
        queueIsPaused: undefined,
        queueName: undefined,
        workerName: 'metric-active-jobs',
        workerIsPaused: false,
        workerIsRunning: true,
      });
      expect(activeJobsMetricService.activeJobsMetricWorkerService.worker.opts).to.deep.include({
        concurrency: 1,
        lockDuration: 900,
      });
    });
  });
});
