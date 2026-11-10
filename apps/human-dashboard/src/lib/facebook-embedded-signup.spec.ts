import { describe, expect, it } from 'vitest';

import {
  embeddedSignupLoginOptions,
  isTrustedFacebookOrigin,
  parseEmbeddedSignupEvent,
} from './facebook-embedded-signup';

const finish = JSON.stringify({
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'FINISH',
  data: { waba_id: ' waba-1 ', phone_number_id: 'phone-1' },
});

describe('isTrustedFacebookOrigin', () => {
  it('trusts https facebook.com and its subdomains only', () => {
    expect(isTrustedFacebookOrigin('https://www.facebook.com')).toBe(true);
    expect(isTrustedFacebookOrigin('https://facebook.com')).toBe(true);
    expect(isTrustedFacebookOrigin('http://www.facebook.com')).toBe(false);
    expect(isTrustedFacebookOrigin('https://facebook.com.evil.example')).toBe(false);
    expect(isTrustedFacebookOrigin('https://notfacebook.com')).toBe(false);
    expect(isTrustedFacebookOrigin('not a url')).toBe(false);
  });
});

describe('parseEmbeddedSignupEvent', () => {
  it('reads the business account and number Meta finished with', () => {
    expect(parseEmbeddedSignupEvent({ origin: 'https://www.facebook.com', data: finish })).toEqual({
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
    });
  });

  it('ignores the same message from anywhere but Facebook', () => {
    expect(parseEmbeddedSignupEvent({ origin: 'https://agentinbox.md', data: finish })).toBeNull();
  });

  it('tells a signup that finished without a number apart', () => {
    const data = JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH_ONLY_WABA', data: { waba_id: 'w' } });

    expect(parseEmbeddedSignupEvent({ origin: 'https://www.facebook.com', data })).toBe('waba_only');
  });

  it('ignores other messages, cancelled signups and half-filled ones', () => {
    const origin = 'https://www.facebook.com';

    expect(parseEmbeddedSignupEvent({ origin, data: 'not json' })).toBeNull();
    expect(parseEmbeddedSignupEvent({ origin, data: JSON.stringify({ type: 'OTHER' }) })).toBeNull();
    expect(
      parseEmbeddedSignupEvent({ origin, data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'CANCEL' }) })
    ).toBeNull();
    expect(
      parseEmbeddedSignupEvent({
        origin,
        data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { waba_id: 'w' } }),
      })
    ).toBeNull();
  });
});

describe('embeddedSignupLoginOptions', () => {
  it('asks Facebook for a code and the session event, for the configuration the API names', () => {
    expect(embeddedSignupLoginOptions('config-1')).toEqual({
      config_id: 'config-1',
      response_type: 'code',
      override_default_response_type: true,
      extras: { sessionInfoVersion: 3 },
    });
  });
});
