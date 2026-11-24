import { describe, expect, it } from 'vitest';
import { signClientIp } from './client-ip-signature';

describe('signClientIp', () => {
  it('signs the time and the IP the way the API checks them', () => {
    // The same vector as the API's `client-ip.spec.ts`, so the two sides can't drift apart.
    expect(signClientIp('203.0.113.7', 'agent-inbox-test-secret', Date.UTC(2026, 10, 23))).toBe(
      '1795392000.efc2847df3540c3a90a333020cec69c6546fe930cd22611656ae6cd214da4828'
    );
  });

  it('counts whole seconds', () => {
    const signedAt = Date.UTC(2026, 10, 23);

    expect(signClientIp('203.0.113.7', 'agent-inbox-test-secret', signedAt + 999)).toBe(
      signClientIp('203.0.113.7', 'agent-inbox-test-secret', signedAt)
    );
  });
});
