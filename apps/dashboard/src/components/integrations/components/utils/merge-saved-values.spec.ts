import { describe, expect, it } from 'vitest';
import { mergeSavedValues } from './merge-saved-values';

const saved = {
  name: 'Webhook',
  active: true,
  credentials: { method: 'POST', url: 'https://example.com' },
  configurations: { inboundWebhookEnabled: false },
  rules: null,
};

describe('mergeSavedValues', () => {
  it('takes the newly saved values for the fields the form left alone, with no undefined keys', () => {
    const next = { ...saved, name: 'Renamed', configurations: { inboundWebhookEnabled: true } };
    const merged = mergeSavedValues(saved, { ...saved, check: undefined }, next);

    expect(merged).toEqual(next);
    expect(Object.keys(merged)).toEqual(Object.keys(next));
  });

  it("keeps the form's own changes, per credential and configuration key", () => {
    const current = { ...saved, active: false, credentials: { ...saved.credentials, method: 'PUT' } };
    const next = { ...saved, name: 'Renamed', configurations: { inboundWebhookEnabled: true } };

    expect(mergeSavedValues(saved, current, next)).toEqual({
      ...next,
      active: false,
      credentials: { method: 'PUT', url: 'https://example.com' },
    });
  });

  it('keeps a value the form added that was never saved, and drops a key the new save removed', () => {
    const current = { ...saved, check: true, credentials: { ...saved.credentials, routingMode: 'static' } };
    const next = { ...saved, credentials: { method: 'POST' } };

    expect(mergeSavedValues(saved, current, next)).toEqual({
      ...next,
      check: true,
      credentials: { method: 'POST', routingMode: 'static' },
    });
  });
});
