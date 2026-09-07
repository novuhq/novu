import { NotificationRepository } from '@novu/dal';
import { FeatureFlagsService } from './feature-flags';
import { NotificationPayloadService } from './notification-payload.service';

type AnyEntity = any;

const makeService = (
  notifications: Array<{ _id: string; payload: unknown }>,
  flagValue = false
): { service: NotificationPayloadService; findCallCount: () => number } => {
  let calls = 0;
  const notificationRepository = {
    find: async () => {
      calls += 1;

      return notifications;
    },
  } as unknown as NotificationRepository;

  const featureFlagsService = {
    getFlag: async () => flagValue,
  } as unknown as FeatureFlagsService;

  return {
    service: new NotificationPayloadService(notificationRepository, featureFlagsService),
    findCallCount: () => calls,
  };
};

describe('NotificationPayloadService', () => {
  describe('hydrateEntitiesPayload', () => {
    it('mutates only carriers missing a payload, in one batched query', async () => {
      const { service, findCallCount } = makeService([{ _id: 'notif-1', payload: { hydrated: true } }]);

      const withPayload = { _id: 'j1', payload: { own: true }, _notificationId: 'notif-x', _environmentId: 'env-1' };
      const withoutPayload = { _id: 'j2', payload: undefined, _notificationId: 'notif-1', _environmentId: 'env-1' };

      await service.hydrateEntitiesPayload([withPayload, withoutPayload] as AnyEntity[]);

      expect(withPayload.payload).toEqual({ own: true });
      expect(withoutPayload.payload).toEqual({ hydrated: true });
      expect(findCallCount()).toBe(1);
    });

    it('works for message-shaped carriers too (generalized)', async () => {
      const { service } = makeService([{ _id: 'notif-1', payload: { from: 'notification' } }]);
      const message = { _id: 'm1', payload: undefined, _notificationId: 'notif-1', _environmentId: 'env-1' };

      await service.hydrateEntitiesPayload([message] as AnyEntity[]);

      expect(message.payload).toEqual({ from: 'notification' });
    });

    it('does not query when every carrier already carries a payload', async () => {
      const { service, findCallCount } = makeService([]);

      await service.hydrateEntitiesPayload([
        { _id: 'j1', payload: { a: 1 }, _notificationId: 'n1', _environmentId: 'env-1' },
      ] as AnyEntity[]);

      expect(findCallCount()).toBe(0);
    });
  });

  describe('resolveDigestEventsPayloads', () => {
    it('passes through legacy raw-payload events untouched without querying', async () => {
      const { service, findCallCount } = makeService([]);
      const events = [{ a: 1 }, { b: 2 }];

      const result = await service.resolveDigestEventsPayloads(events, 'env-1');

      expect(result).toBe(events);
      expect(findCallCount()).toBe(0);
    });

    it('resolves refs to notification payloads and preserves order', async () => {
      const { service, findCallCount } = makeService([
        { _id: 'notif-a', payload: { value: 'a' } },
        { _id: 'notif-b', payload: { value: 'b' } },
      ]);

      const events = [
        { __payloadRef: true, _jobId: 'j-a', _notificationId: 'notif-a', time: '1' },
        { __payloadRef: true, _jobId: 'j-b', _notificationId: 'notif-b', time: '2' },
      ];

      const result = await service.resolveDigestEventsPayloads(events as AnyEntity[], 'env-1');

      expect(result).toEqual([{ value: 'a' }, { value: 'b' }]);
      expect(findCallCount()).toBe(1);
    });

    it('handles mixed-era events (legacy payloads + refs) in one window', async () => {
      const { service } = makeService([{ _id: 'notif-a', payload: { value: 'a' } }]);

      const legacy = { value: 'legacy' };
      const events = [legacy, { __payloadRef: true, _jobId: 'j-a', _notificationId: 'notif-a', time: '2' }];

      const result = await service.resolveDigestEventsPayloads(events as AnyEntity[], 'env-1');

      expect(result).toEqual([legacy, { value: 'a' }]);
    });

    it('falls back to an empty object when a referenced notification is missing', async () => {
      const { service } = makeService([]);

      const events = [{ __payloadRef: true, _jobId: 'j-a', _notificationId: 'gone', time: '1' }];

      const result = await service.resolveDigestEventsPayloads(events as AnyEntity[], 'env-1');

      expect(result).toEqual([{}]);
    });
  });

  describe('prepareJobExecutionPayload', () => {
    it('hydrates job.payload from the notification and returns the flag + resolved events', async () => {
      const { service } = makeService([], true);

      const job = {
        payload: undefined,
        _organizationId: 'org-1',
        _environmentId: 'env-1',
        digest: { events: [{ a: 1 }] },
      } as AnyEntity;
      const notification = { payload: { from: 'notification' }, _organizationId: 'org-1', _environmentId: 'env-1' };

      const result = await service.prepareJobExecutionPayload(job, notification as AnyEntity);

      expect(job.payload).toEqual({ from: 'notification' });
      expect(result.isPayloadDedupEnabled).toBe(true);
      expect(result.digestEvents).toEqual([{ a: 1 }]);
    });

    it('keeps a present job payload as authoritative', async () => {
      const { service } = makeService([]);
      const job = { payload: { own: true }, _organizationId: 'org-1', _environmentId: 'env-1' } as AnyEntity;

      await service.prepareJobExecutionPayload(job, { payload: { other: true } } as AnyEntity);

      expect(job.payload).toEqual({ own: true });
    });
  });
});
