import { HealthIndicatorFunction } from '@nestjs/terminus';
import { QueueBackend } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  const originalQueueBackend = process.env.QUEUE_BACKEND;
  const originalElasticacheHost = process.env.ELASTICACHE_CLUSTER_SERVICE_HOST;

  function makeController() {
    const healthCheckService = {
      check: sinon.stub().callsFake(async (checks: HealthIndicatorFunction[]) => {
        const results = await Promise.all(checks.map((check) => check()));

        return Object.assign({}, ...results);
      }),
    };
    const dalHealthIndicator = { isHealthy: sinon.stub().resolves({ db: { status: 'up' } }) };
    const cacheHealthIndicator = { isHealthy: sinon.stub().resolves({ cacheService: { status: 'up' } }) };
    const workflowQueueHealthIndicator = {
      isHealthy: sinon.stub().rejects(new Error('WorkflowQueueService Health is not ready')),
    };
    const controller = new HealthController(
      healthCheckService as any,
      cacheHealthIndicator as any,
      dalHealthIndicator as any,
      workflowQueueHealthIndicator as any
    );

    return { controller, workflowQueueHealthIndicator };
  }

  afterEach(() => {
    if (originalQueueBackend === undefined) {
      delete process.env.QUEUE_BACKEND;
    } else {
      process.env.QUEUE_BACKEND = originalQueueBackend;
    }

    if (originalElasticacheHost === undefined) {
      delete process.env.ELASTICACHE_CLUSTER_SERVICE_HOST;
    } else {
      process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = originalElasticacheHost;
    }
  });

  it('skips the BullMQ workflow queue check when QUEUE_BACKEND=sqs', async () => {
    process.env.QUEUE_BACKEND = QueueBackend.SQS;
    process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = 'elasticache.internal';
    const { controller, workflowQueueHealthIndicator } = makeController();

    const result = (await controller.healthCheck()) as Record<string, unknown>;

    expect(workflowQueueHealthIndicator.isHealthy.called).to.equal(false);
    expect(result).to.have.property('db');
    expect(result).to.have.property('cacheService');
    expect(result).to.not.have.property('workflowQueue');
  });

  for (const backend of [QueueBackend.BULLMQ, QueueBackend.SQS_BULLMQ]) {
    it(`keeps the BullMQ workflow queue check when QUEUE_BACKEND=${backend}`, async () => {
      process.env.QUEUE_BACKEND = backend;
      const { controller, workflowQueueHealthIndicator } = makeController();

      let error: unknown;
      try {
        await controller.healthCheck();
      } catch (caught) {
        error = caught;
      }

      expect(workflowQueueHealthIndicator.isHealthy.calledOnce).to.equal(true);
      expect(error).to.be.instanceOf(Error);
    });
  }
});
