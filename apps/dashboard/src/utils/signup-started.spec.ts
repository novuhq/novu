import { SIGNUP_ANALYTICS_EVENTS, SignupSourceEnum } from '@novu/shared';
import { describe, expect, it, vi } from 'vitest';
import { resolveSignupStartedProperties } from './signup-started';

const TOKEN = 'T'.repeat(32);

describe('resolveSignupStartedProperties', () => {
  it('uses the shared Signup Started event name', () => {
    expect(SIGNUP_ANALYTICS_EVENTS.SIGNUP_STARTED).toBe('Signup Started');
  });

  it('reports a plain sign-up page visit as a dashboard signup without looking anything up', async () => {
    const lookup = vi.fn();

    expect(await resolveSignupStartedProperties(null, lookup)).toEqual({ source: SignupSourceEnum.DASHBOARD });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('attributes a return to an inbox claim link to inbox', async () => {
    const lookup = vi.fn().mockResolvedValue({ source: SignupSourceEnum.INBOX });

    expect(await resolveSignupStartedProperties(TOKEN, lookup)).toEqual({ source: SignupSourceEnum.INBOX });
    expect(lookup).toHaveBeenCalledWith(TOKEN);
  });

  it('attributes a return to an agent claim link to agent, keeping its client', async () => {
    const lookup = vi.fn().mockResolvedValue({ source: SignupSourceEnum.AGENT, client: 'cursor' });

    expect(await resolveSignupStartedProperties(TOKEN, lookup)).toEqual({
      source: SignupSourceEnum.AGENT,
      client: 'cursor',
    });
  });

  it('falls back to dashboard when the claim link can no longer be read', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('404'));

    expect(await resolveSignupStartedProperties(TOKEN, lookup)).toEqual({ source: SignupSourceEnum.DASHBOARD });
  });
});
