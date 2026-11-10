import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSignupPairing,
  embeddedSignupLoginOptions,
  isTrustedFacebookOrigin,
  loadFacebookSdk,
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

describe('createSignupPairing', () => {
  const session = { wabaId: 'waba-1', phoneNumberId: 'phone-1' };

  function pairing() {
    const onReady = vi.fn();
    const onTimeout = vi.fn();

    return { pair: createSignupPairing({ onReady, onTimeout, timeoutMs: 1000 }), onReady, onTimeout };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finishes once both answers are in, code first', () => {
    const { pair, onReady, onTimeout } = pairing();

    pair.code('meta-code');
    expect(onReady).not.toHaveBeenCalled();
    pair.session(session);

    expect(onReady).toHaveBeenCalledWith({ code: 'meta-code', ...session });
    vi.advanceTimersByTime(5000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('finishes once both answers are in, session first', () => {
    const { pair, onReady } = pairing();

    pair.session(session);
    pair.code('meta-code');

    expect(onReady).toHaveBeenCalledOnce();
    expect(onReady).toHaveBeenCalledWith({ code: 'meta-code', ...session });
  });

  it('gives up when the session never follows the code', () => {
    const { pair, onReady, onTimeout } = pairing();

    pair.code('meta-code');
    vi.advanceTimersByTime(1000);

    expect(onTimeout).toHaveBeenCalledOnce();
    pair.session(session);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('gives up when the code never follows the session', () => {
    const { pair, onTimeout } = pairing();

    pair.session(session);
    vi.advanceTimersByTime(1000);

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it('says nothing once cancelled', () => {
    const { pair, onReady, onTimeout } = pairing();

    pair.code('meta-code');
    pair.cancel();
    pair.session(session);
    vi.advanceTimersByTime(5000);

    expect(onReady).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });
});

describe('loadFacebookSdk', () => {
  it('takes a script that failed to load out of the page, so the next click downloads it again', async () => {
    const appended: Array<{ id: string; onerror?: () => void; remove: () => void }> = [];
    const removed: string[] = [];
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      getElementById: (id: string) => appended.find((script) => script.id === id && !removed.includes(id)) ?? null,
      createElement: () => {
        const script = {
          id: '',
          onerror: undefined as undefined | (() => void),
          remove: () => removed.push(script.id),
        };

        return script;
      },
      body: { appendChild: (script: (typeof appended)[number]) => appended.push(script) },
    });

    try {
      const first = loadFacebookSdk('app-1');
      appended[0].onerror?.();
      await expect(first).rejects.toThrow();
      expect(removed).toEqual(['facebook-jssdk']);

      const second = loadFacebookSdk('app-1');
      expect(appended).toHaveLength(2);
      appended[1].onerror?.();
      await expect(second).rejects.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
