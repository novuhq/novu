import { NotificationTemplateEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum, ISubscribersDefine, ResourceEnum, SubscriberSourceEnum } from '@novu/shared';
import { IProcessSubscriberBulkJobDto } from '../../dtos';
import { buildUsageKey } from '../../services/cache/key-builders';
import { BaseTriggerCommand, TriggerBase } from './trigger-base.usecase';

// ESM-only dependency pulled in transitively (feature-flags → LaunchDarkly); jest 27 cannot parse it,
// and the spec injects its own feature flags mock anyway.
jest.mock('@launchdarkly/node-server-sdk', () => ({ init: jest.fn() }));

const ENVIRONMENT_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const ORGANIZATION_ID = 'aaaaaaaaaaaaaaaaaaaaaaa2';
const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaa3';
const WORKFLOW_ID = 'aaaaaaaaaaaaaaaaaaaaaaa4';
const QUEUE_CHUNK_SIZE = 2;
const USAGE_KEY = buildUsageKey({ _organizationId: ORGANIZATION_ID, resourceType: ResourceEnum.EVENTS });

class TestTrigger extends TriggerBase {
  send(command: BaseTriggerCommand, subscribers: ISubscribersDefine[]) {
    return this.sendToProcessSubscriberService(command, subscribers, SubscriberSourceEnum.SINGLE);
  }
}

describe('TriggerBase', () => {
  function buildTrigger({ workerIncrementEnabled = false } = {}) {
    const subscriberProcessQueueService = { addBulk: jest.fn().mockResolvedValue(undefined) };
    const cacheService = { incrIfExistsAtomic: jest.fn().mockResolvedValue(1) };
    const featureFlagsService = { getFlag: jest.fn().mockResolvedValue(workerIncrementEnabled) };
    const logger = { setContext: jest.fn(), warn: jest.fn() };

    const trigger = new TestTrigger(
      subscriberProcessQueueService as never,
      cacheService as never,
      featureFlagsService as never,
      logger as never,
      QUEUE_CHUNK_SIZE
    );

    return { trigger, subscriberProcessQueueService, cacheService, featureFlagsService, logger };
  }

  function buildCommand(): BaseTriggerCommand {
    return {
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      transactionId: 'tx_1',
      identifier: 'test-workflow',
      payload: {},
      overrides: {},
      template: { _id: WORKFLOW_ID } as NotificationTemplateEntity,
      contextKeys: [],
      tenant: null,
    };
  }

  function buildSubscribers(count: number): ISubscribersDefine[] {
    return Array.from({ length: count }, (_, index) => ({ subscriberId: `subscriber-${index + 1}` }));
  }

  function enqueuedJobs(addBulk: jest.Mock): IProcessSubscriberBulkJobDto[] {
    return addBulk.mock.calls.flatMap(([chunk]) => chunk);
  }

  describe('when the worker usage increment flag is off', () => {
    it('should enqueue unstamped jobs and increment the usage counter by each chunk length', async () => {
      const { trigger, subscriberProcessQueueService, cacheService } = buildTrigger();

      await trigger.send(buildCommand(), buildSubscribers(3));

      const jobs = enqueuedJobs(subscriberProcessQueueService.addBulk);
      expect(jobs.map((job) => job.data.subscriber.subscriberId)).toEqual([
        'subscriber-1',
        'subscriber-2',
        'subscriber-3',
      ]);
      expect(jobs.every((job) => !Object.prototype.hasOwnProperty.call(job.data, 'incrementUsageInWorker'))).toBe(true);
      expect(cacheService.incrIfExistsAtomic.mock.calls).toEqual([
        [USAGE_KEY, 2],
        [USAGE_KEY, 1],
      ]);
    });
  });

  describe('when the worker usage increment flag is on', () => {
    it('should stamp every job for the worker and skip the usage counter increment', async () => {
      const { trigger, subscriberProcessQueueService, cacheService } = buildTrigger({ workerIncrementEnabled: true });

      await trigger.send(buildCommand(), buildSubscribers(3));

      const jobs = enqueuedJobs(subscriberProcessQueueService.addBulk);
      expect(jobs).toHaveLength(3);
      expect(jobs.every((job) => job.data.incrementUsageInWorker === true)).toBe(true);
      expect(cacheService.incrIfExistsAtomic).not.toHaveBeenCalled();
    });

    it('should log and swallow an enqueue failure', async () => {
      const { trigger, subscriberProcessQueueService, cacheService, logger } = buildTrigger({
        workerIncrementEnabled: true,
      });
      const error = new Error('queue unavailable');
      subscriberProcessQueueService.addBulk.mockRejectedValue(error);

      await expect(trigger.send(buildCommand(), buildSubscribers(1))).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith({ err: error }, 'Failed to add jobs to queue');
      expect(cacheService.incrIfExistsAtomic).not.toHaveBeenCalled();
    });
  });

  it("should read the worker usage increment flag once per call for the command's organization", async () => {
    const { trigger, featureFlagsService } = buildTrigger();

    await trigger.send(buildCommand(), buildSubscribers(3));

    expect(featureFlagsService.getFlag).toHaveBeenCalledTimes(1);
    expect(featureFlagsService.getFlag).toHaveBeenCalledWith({
      key: FeatureFlagsKeysEnum.IS_USAGE_COUNTER_WORKER_INCREMENT_ENABLED,
      defaultValue: false,
      organization: { _id: ORGANIZATION_ID },
    });
  });

  it('should not read the flag, enqueue or increment usage when there are no subscribers', async () => {
    const { trigger, subscriberProcessQueueService, cacheService, featureFlagsService } = buildTrigger();

    await trigger.send(buildCommand(), []);

    expect(featureFlagsService.getFlag).not.toHaveBeenCalled();
    expect(subscriberProcessQueueService.addBulk).not.toHaveBeenCalled();
    expect(cacheService.incrIfExistsAtomic).not.toHaveBeenCalled();
  });
});
