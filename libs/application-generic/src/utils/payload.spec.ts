import { getJobDigest } from './digest';
import { buildDigestEvent, getEffectiveJobPayload, isDigestEventPayloadRef } from './payload';

type AnyJob = any;

describe('payload dedup pure helpers', () => {
  describe('getEffectiveJobPayload', () => {
    it('returns the job payload as-is when present (authoritative)', () => {
      const jobPayload = { name: 'from-job' };
      const notification = { payload: { name: 'from-notification' } };

      expect(getEffectiveJobPayload({ payload: jobPayload }, notification)).toBe(jobPayload);
    });

    it('falls back to the notification payload when the job has none', () => {
      const notificationPayload = { name: 'from-notification' };

      expect(getEffectiveJobPayload({ payload: undefined }, { payload: notificationPayload })).toBe(
        notificationPayload
      );
    });

    it('returns undefined when neither carries a payload', () => {
      expect(getEffectiveJobPayload({ payload: undefined }, { payload: undefined })).toBeUndefined();
      expect(getEffectiveJobPayload({ payload: undefined }, null)).toBeUndefined();
    });

    it('treats an empty-object job payload as present', () => {
      const empty = {};

      expect(getEffectiveJobPayload({ payload: empty }, { payload: { a: 1 } })).toBe(empty);
    });
  });

  describe('buildDigestEvent', () => {
    it('stores the payload inline when the job carries one (legacy / flag off)', () => {
      const payload = { foo: 'bar' };
      const event = buildDigestEvent({
        _id: 'job-1',
        payload,
        _notificationId: 'notif-1',
        createdAt: '2026-01-01',
      } as AnyJob);

      expect(event).toBe(payload);
      expect(isDigestEventPayloadRef(event)).toBe(false);
    });

    it('stores a notification reference when the job has no payload (dedup)', () => {
      const event = buildDigestEvent({
        _id: 'job-1',
        payload: undefined,
        _notificationId: 'notif-1',
        createdAt: '2026-01-01',
      } as AnyJob);

      expect(isDigestEventPayloadRef(event)).toBe(true);
      expect(event).toEqual({
        __payloadRef: true,
        _jobId: 'job-1',
        _notificationId: 'notif-1',
        time: '2026-01-01',
      });
    });
  });

  describe('getJobDigest (payload-independent matching)', () => {
    it('uses the persisted digest metadata value even when the job has no payload (dedup)', () => {
      const job = {
        payload: undefined,
        digest: { digestKey: 'orderId', digestValue: 'order-42' },
      } as AnyJob;

      expect(getJobDigest(job)).toMatchObject({ digestKey: 'orderId', digestValue: 'order-42' });
    });

    it('falls back to deriving the value from the payload for legacy jobs without persisted value', () => {
      const job = {
        payload: { orderId: 'order-legacy' },
        digest: { digestKey: 'orderId' },
      } as AnyJob;

      expect(getJobDigest(job)).toMatchObject({ digestKey: 'orderId', digestValue: 'order-legacy' });
    });

    it('prefers the persisted value over the payload when both exist', () => {
      const job = {
        payload: { orderId: 'stale-from-payload' },
        digest: { digestKey: 'orderId', digestValue: 'authoritative' },
      } as AnyJob;

      expect(getJobDigest(job).digestValue).toBe('authoritative');
    });
  });
});
