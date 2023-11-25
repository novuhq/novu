import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';

import {
  MetricsService,
  ActiveJobMetricSchedulerService,
  ActiveJobMetricScheduledWorkerService,
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
let metricsService: MetricsService;
let moduleRef: TestingModule;

const activeJobsMetricSchedulerService = {} as ActiveJobMetricSchedulerService;
const activeJobsMetricWorkerService = {} as ActiveJobMetricScheduledWorkerService;
const everySpy = sinon.spy();
const initWorkerSpy = sinon.spy();
activeJobsMetricSchedulerService.every = everySpy;
activeJobsMetricWorkerService.initWorker = initWorkerSpy;

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
  });

  describe('Environment variables not set', () => {
    beforeEach(() => {
      process.env.NOVU_MANAGED_SERVICE = 'false';
      process.env.NEW_RELIC_LICENSE_KEY = '';

      activeJobsMetricService = new ActiveJobsMetricService(
        [standardService, webSocketsQueueService, workflowQueueService],
        metricsService,
        activeJobsMetricSchedulerService,
        activeJobsMetricWorkerService
      );
    });

    it('should not initialize neither the queue or the worker if the environment conditions are not met', async () => {
      expect(activeJobsMetricService).to.be.ok;
      expect(activeJobsMetricService).to.have.all.keys(['metricsService', 'scheduler', 'tokenList', 'worker']);
      expect(everySpy.notCalled).to.be.true;
      expect(initWorkerSpy.notCalled).to.be.true;
    });
  });

  describe('Environment variables configured', () => {
    beforeEach(async () => {
      process.env.NOVU_MANAGED_SERVICE = 'true';
      process.env.NEW_RELIC_LICENSE_KEY = 'license';

      activeJobsMetricService = new ActiveJobsMetricService(
        [standardService, webSocketsQueueService, workflowQueueService],
        metricsService,
        activeJobsMetricSchedulerService,
        activeJobsMetricWorkerService
      );
    });

    it('should be initialised properly', async () => {
      expect(activeJobsMetricService).to.be.ok;
      expect(activeJobsMetricService).to.have.all.keys('tokenList', 'metricsService', 'scheduler', 'worker');
      expect(everySpy.called).to.be.true;
      expect(initWorkerSpy.called).to.be.true;
    });
  });
});
