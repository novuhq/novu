import { getEffectiveJobOverrides } from './trigger-overrides';

describe('getEffectiveJobOverrides', () => {
  it('returns the job overrides as-is when present (authoritative)', () => {
    const jobOverrides = { email: { toRecipient: 'job@example.com' } };
    const notification = { overrides: { email: { toRecipient: 'notification@example.com' } } };

    expect(getEffectiveJobOverrides({ overrides: jobOverrides }, notification)).toBe(jobOverrides);
  });

  it('treats an empty-object job overrides as present', () => {
    const empty = {};
    const notification = { overrides: { email: { toRecipient: 'notification@example.com' } } };

    expect(getEffectiveJobOverrides({ overrides: empty }, notification)).toBe(empty);
  });

  it('falls back to the notification overrides when the job has none', () => {
    const notificationOverrides = { email: { integrationIdentifier: 'sendgrid-backup' } };

    expect(getEffectiveJobOverrides({ overrides: undefined }, { overrides: notificationOverrides })).toBe(
      notificationOverrides
    );
  });

  it('returns an empty object when neither carries overrides', () => {
    expect(getEffectiveJobOverrides({ overrides: undefined }, { overrides: undefined })).toEqual({});
    expect(getEffectiveJobOverrides({ overrides: undefined }, null)).toEqual({});
    expect(getEffectiveJobOverrides({ overrides: undefined })).toEqual({});
  });
});
