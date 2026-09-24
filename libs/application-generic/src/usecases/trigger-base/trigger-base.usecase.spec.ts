import { NotificationTemplateEntity } from '@novu/dal';
import { SubscriberSourceEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { CacheService } from '../../services/cache/cache.service';
import { PartialDispatchError } from '../../services/queues/queue-base.service';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerAttachmentsService } from '../../services/storage/trigger-attachments.service';
import { BaseTriggerCommand, TriggerBase } from './trigger-base.usecase';

// Both barrels load the LaunchDarkly SDK, whose ESM build jest cannot parse.
jest.mock('../../services/queues/subscriber-process-queue.service', () => ({
  SubscriberProcessQueueService: class {},
}));
jest.mock('../../utils', () => jest.requireActual('../../utils/subscribers.utils'));

class TestTrigger extends TriggerBase {
  async fanOut(command: BaseTriggerCommand, subscriberIds: string[]) {
    return this.sendToProcessSubscriberService(
      command,
      subscriberIds.map((subscriberId) => ({ subscriberId })),
      SubscriberSourceEnum.TOPIC
    );
  }
}

const attachments = [{ name: 'logo.png', mime: 'image/png', storagePath: 'org/env/random/logo.png' }];

const command = {
  environmentId: 'environment-id',
  organizationId: 'organization-id',
  userId: 'user-id',
  transactionId: 'transaction-id',
  identifier: 'workflow',
  payload: { attachments },
  overrides: {},
  template: { _id: 'template-id' } as NotificationTemplateEntity,
  contextKeys: [],
  tenant: null,
} as BaseTriggerCommand;

describe('TriggerBase - attachment references', () => {
  let addBulk: jest.Mock;
  let retain: jest.Mock;
  let trigger: TestTrigger;

  beforeEach(() => {
    addBulk = jest.fn().mockResolvedValue(undefined);
    retain = jest.fn().mockResolvedValue(undefined);
    trigger = new TestTrigger(
      { addBulk } as unknown as SubscriberProcessQueueService,
      { incrIfExistsAtomic: jest.fn().mockResolvedValue(null) } as unknown as CacheService,
      { retain } as unknown as TriggerAttachmentsService,
      { warn: jest.fn() } as unknown as PinoLogger,
      2
    );
  });

  const retainedCounts = () => retain.mock.calls.map(([, count]) => count).sort();

  it('counts every subscriber of the chunks that reached the queue', async () => {
    await trigger.fanOut(command, ['a', 'b', 'c']);

    expect(retainedCounts()).toEqual([1, 2]);
    expect(retain.mock.calls[0][0]).toEqual({
      environmentId: 'environment-id',
      transactionId: 'transaction-id',
      attachments,
    });
  });

  it('does not count a chunk that never reached the queue', async () => {
    addBulk.mockRejectedValueOnce(new Error('queue is unavailable'));

    await trigger.fanOut(command, ['a', 'b', 'c']);

    expect(retainedCounts()).toEqual([0, 1]);
  });

  it('counts only the delivered part of a partially sent chunk', async () => {
    addBulk.mockImplementationOnce(async (chunk: unknown[]) => {
      throw new PartialDispatchError([chunk[1]] as never, new Error('fallback failed'));
    });

    await trigger.fanOut(command, ['a', 'b']);

    expect(retainedCounts()).toEqual([1]);
  });
});
