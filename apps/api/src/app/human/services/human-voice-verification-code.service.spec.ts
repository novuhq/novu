import { ServiceUnavailableException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  HumanVoiceVerificationCodeService,
  VOICE_VERIFICATION_MAX_ATTEMPTS,
} from './human-voice-verification-code.service';

const key = { environmentId: 'env1', agentId: 'agent1', subscriberId: 'alice' };

describe('HumanVoiceVerificationCodeService', () => {
  function makeService(hooks?: { afterReserve?: (attempts: number, keys: string[]) => void }) {
    const cacheStore = new Map<string, string>();
    const cacheService = {
      get: sinon.stub().callsFake(async (storageKey: string) => cacheStore.get(storageKey) ?? null),
      set: sinon.stub().callsFake(async (storageKey: string, value: string) => {
        cacheStore.set(storageKey, String(value));

        return 'OK';
      }),
      del: sinon.stub().callsFake(async (storageKey: string | string[]) => {
        for (const key of Array.isArray(storageKey) ? storageKey : [storageKey]) {
          cacheStore.delete(key);
        }
      }),
      eval: sinon.stub().callsFake(async (script: string, keys: string[], args: Array<string | number>) => {
        if (script.includes('INCR')) {
          const raw = cacheStore.get(keys[0]);
          if (!raw) {
            return null;
          }
          if (raw === 'locked') {
            return 'locked';
          }

          const attemptsKey = keys[1];
          const next = Number(cacheStore.get(attemptsKey) ?? '0') + 1;
          cacheStore.set(attemptsKey, String(next));
          if (next > Number(args[1])) {
            cacheStore.set(keys[0], 'locked');
            cacheStore.delete(attemptsKey);

            return 'locked';
          }

          hooks?.afterReserve?.(next, keys);

          return JSON.stringify({ attempts: next, raw });
        }

        if (script.includes("'locked'")) {
          const stored = cacheStore.get(keys[0]);
          if (!stored) {
            return 0;
          }
          if (stored === 'locked') {
            return 1;
          }

          const requested = stored.match(/"requestedAt":"([^"]+)"/)?.[1];
          if (requested !== String(args[0])) {
            return 0;
          }

          cacheStore.set(keys[0], 'locked');
          cacheStore.delete(keys[1]);

          return 1;
        }

        const raw = cacheStore.get(keys[0]);
        const requested = raw?.match(/"requestedAt":"([^"]+)"/)?.[1];
        if (!raw || requested !== String(args[0])) {
          return 0;
        }

        cacheStore.delete(keys[0]);
        cacheStore.delete(keys[1]);

        return 1;
      }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanVoiceVerificationCodeService(cacheService as never, logger as never);

    return { service, cacheStore };
  }

  it('accepts the code it just issued and rejects a wrong one', async () => {
    const { service, cacheStore } = makeService();
    const issued = await service.issue(key, { address: '+1555121212', requestedAt: 't1' });

    expect(issued.code).to.match(/^\d{4}$/);
    expect([...cacheStore.values()].some((value) => value.includes(issued.code))).to.equal(false);

    const wrong = await service.check(key, '000000' === issued.code ? '000001' : '000000');
    expect(wrong).to.deep.equal({
      ok: false,
      reason: 'mismatch',
      attemptsRemaining: VOICE_VERIFICATION_MAX_ATTEMPTS - 1,
    });

    const right = await service.check(key, issued.code);
    expect(right).to.deep.equal({ ok: true, address: '+1555121212', requestedAt: 't1' });
  });

  it('locks the code after too many wrong guesses', async () => {
    const { service } = makeService();
    const issued = await service.issue(key, { address: '+1555121212', requestedAt: 't1' });
    const wrong = issued.code === '111111' ? '222222' : '111111';

    for (let attempt = 0; attempt < VOICE_VERIFICATION_MAX_ATTEMPTS - 1; attempt += 1) {
      const result = await service.check(key, wrong);
      expect(result.ok).to.equal(false);
      if (!result.ok) {
        expect(result.reason).to.equal('mismatch');
      }
    }

    const locked = await service.check(key, wrong);
    expect(locked).to.deep.equal({ ok: false, reason: 'locked' });

    const after = await service.check(key, issued.code);
    expect(after).to.deep.equal({ ok: false, reason: 'locked' });
  });

  it('burns the code after the budget even when a later guess is correct', async () => {
    const { service } = makeService();
    const issued = await service.issue(key, { address: '+1555121212', requestedAt: 't1' });

    for (let attempt = 0; attempt < VOICE_VERIFICATION_MAX_ATTEMPTS; attempt += 1) {
      const result = await service.check(key, issued.code);
      expect(result.ok).to.equal(true);
    }

    expect(await service.check(key, issued.code)).to.deep.equal({ ok: false, reason: 'locked' });
  });

  it('does not lock a code a resend already replaced', async () => {
    const { service, cacheStore } = makeService({
      afterReserve(attempts, keys) {
        if (attempts !== VOICE_VERIFICATION_MAX_ATTEMPTS) {
          return;
        }

        const current = cacheStore.get(keys[0]);
        if (!current) {
          return;
        }

        const stored = JSON.parse(current) as { requestedAt: string };
        cacheStore.set(keys[0], JSON.stringify({ ...stored, requestedAt: 't2', hash: 'replaced' }));
      },
    });
    const issued = await service.issue(key, { address: '+1555121212', requestedAt: 't1' });
    const wrong = issued.code === '1111' ? '2222' : '1111';

    for (let attempt = 0; attempt < VOICE_VERIFICATION_MAX_ATTEMPTS - 1; attempt += 1) {
      await service.check(key, wrong);
    }

    expect(await service.check(key, wrong)).to.deep.equal({ ok: false, reason: 'locked' });
    expect([...cacheStore.values()].some((value) => value.includes('"requestedAt":"t2"'))).to.equal(true);
    expect([...cacheStore.values()].includes('locked')).to.equal(false);
  });

  it('counts overlapping wrong guesses separately', async () => {
    const { service } = makeService();
    const issued = await service.issue(key, { address: '+1555121212', requestedAt: 't1' });
    const wrong = issued.code === '111111' ? '222222' : '111111';

    const [first, second] = await Promise.all([service.check(key, wrong), service.check(key, wrong)]);
    const remaining = [first, second].map((result) => {
      if (result.ok || result.reason !== 'mismatch') {
        return result.ok ? 'ok' : result.reason;
      }

      return result.attemptsRemaining;
    });

    expect(remaining.sort()).to.deep.equal([VOICE_VERIFICATION_MAX_ATTEMPTS - 2, VOICE_VERIFICATION_MAX_ATTEMPTS - 1]);
  });

  it('forgets the code when it is cleared or expired', async () => {
    const { service } = makeService();
    const issued = await service.issue(key, { address: '+1555121212', requestedAt: 't1' });
    await service.clear(key);

    expect(await service.check(key, issued.code)).to.deep.equal({ ok: false, reason: 'missing' });
  });

  it('refuses to issue a code when the cache is down', async () => {
    const cacheService = {
      get: sinon.stub().resolves(null),
      set: sinon.stub().resolves(undefined),
    };
    const service = new HumanVoiceVerificationCodeService(
      cacheService as never,
      {
        setContext: sinon.stub(),
      } as never
    );

    try {
      await service.issue(key, { address: '+1555121212', requestedAt: 't1' });
      expect.fail('expected verification_unavailable');
    } catch (err) {
      expect(err).to.be.instanceOf(ServiceUnavailableException);
    }
  });
});
