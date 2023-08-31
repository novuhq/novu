import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { MetricQueueActiveService } from './metric-queue-active.service';

import { WorkflowModule } from '../workflow.module';

let metricQueueService: MetricQueueActiveService;

describe('Metric Queue service', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();

    metricQueueService = moduleRef.get<MetricQueueActiveService>(MetricQueueActiveService);
  });

  afterEach(async () => {
    await metricQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(metricQueueService).to.be.ok;
    expect(metricQueueService).to.have.all.keys('DEFAULT_ATTEMPTS', 'bullMqService', 'name', 'token_list');
    expect(await metricQueueService.bullMqService.getRunningStatus()).to.deep.include({
      queueName: 'metric-complete',
      workerName: 'metric-completed',
    });
    expect(metricQueueService.bullMqService.worker.opts).to.deep.include({
      concurrency: 1,
      lockDuration: 500,
    });
    expect(metricQueueService.bullMqService.worker.opts.connection).to.deep.include({
      host: 'localhost',
      port: 6379,
    });
  });
});
