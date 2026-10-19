import { HttpException, HttpStatus, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  codeKey,
  HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS,
  HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES,
  HUMAN_VERIFICATION_CODE_MAX_NETWORK_FAILURES,
  HUMAN_VERIFICATION_CODE_MAX_SLOT_FAILURES,
  HumanVerificationCodeService,
  slotCounterKey,
  VERIFICATION_CODE_INVALID,
  VERIFICATION_CODE_TOO_MANY_TRIES,
} from './human-verification-code.service';
import type { HumanVerificationTokenPayload } from './human-verification-token.service';

describe('HumanVerificationCodeService', () => {
  const payload = (requestedAt = '2026-10-01T12:00:00.000Z'): HumanVerificationTokenPayload => ({
    env: 'env-1',
    org: 'org-1',
    agentId: 'agent-1',
    subscriberId: 'alice',
    via: HumanChannelViaEnum.EMAIL,
    address: 'alice@example.com',
    requestedAt,
  });

  function setup({ cacheEnabled = true } = {}) {
    const strings = new Map<string, { value: string; expireAt: number | null }>();
    const sets = new Map<string, { members: Set<string>; expireAt: number | null }>();

    const now = () => Math.floor(Date.now() / 1000);

    function liveString(key: string) {
      const entry = strings.get(key);
      if (!entry) {
        return null;
      }
      if (entry.expireAt !== null && entry.expireAt <= now()) {
        strings.delete(key);

        return null;
      }

      return entry;
    }

    function liveSet(key: string) {
      const entry = sets.get(key);
      if (!entry) {
        return null;
      }
      if (entry.expireAt !== null && entry.expireAt <= now()) {
        sets.delete(key);

        return null;
      }

      return entry;
    }

    function ttlOf(key: string): number {
      const text = liveString(key);
      if (text) {
        return text.expireAt === null ? -1 : text.expireAt - now();
      }
      const group = liveSet(key);
      if (!group) {
        return -2;
      }

      return group.expireAt === null ? -1 : group.expireAt - now();
    }

    function issue(keys: string[], args: Array<string | number>): number {
      const [code, slots] = keys;
      const [record, ttl, slotKey] = args;
      if (liveString(code)) {
        return 0;
      }

      const seconds = Number(ttl);
      strings.set(code, { value: String(record), expireAt: now() + seconds });
      const group = liveSet(slots) ?? { members: new Set<string>(), expireAt: null };
      group.members.add(String(slotKey));
      group.expireAt = now() + seconds;
      sets.set(slots, group);

      return 1;
    }

    function countWrong(keys: string[], args: Array<string | number>): string {
      const [, slots, addressFails] = keys;
      const [, maxSlot, maxAddress, window, slotTtl] = args.map(Number);
      const already = Number(liveString(addressFails)?.value ?? '0');
      if (already >= maxAddress) {
        return 'BLOCKED';
      }

      const current = liveString(addressFails);
      const next = Number(current?.value ?? '0') + 1;
      strings.set(addressFails, {
        value: String(next),
        expireAt: current ? current.expireAt : now() + window,
      });

      let locked = false;
      for (const slotKey of liveSet(slots)?.members ?? []) {
        const slot = liveString(slotKey);
        const count = Number(slot?.value ?? '0') + 1;
        const slotsTtl = ttlOf(slots);
        strings.set(slotKey, {
          value: String(count),
          expireAt: slot ? slot.expireAt : now() + (slotsTtl < 1 ? slotTtl : slotsTtl),
        });
        if (count >= maxSlot) {
          locked = true;
        }
      }

      if (locked) {
        return 'TOO_MANY_SLOT';
      }
      if (next >= maxAddress) {
        return 'TOO_MANY_ADDR';
      }

      return 'INVALID';
    }

    function redeem(keys: string[], args: Array<string | number>): string {
      const [codeKeyName] = keys;
      const [nowArg, maxSlot] = args.map(Number);
      const raw = liveString(codeKeyName)?.value;
      let record: { payload?: unknown; slotKey?: string; expiresAt?: number; usedAt?: number } | null = null;
      if (raw) {
        try {
          record = JSON.parse(raw);
        } catch {
          record = null;
        }
      }

      if (record?.payload && record.slotKey && Number(record.expiresAt) > nowArg) {
        const slotFails = Number(liveString(record.slotKey)?.value ?? '0');
        if (slotFails >= maxSlot) {
          return 'TOO_MANY_SLOT';
        }

        const encoded = JSON.stringify(record.payload);
        if (record.usedAt) {
          return `USED${encoded}`;
        }

        const entry = liveString(codeKeyName);
        const ttl = entry?.expireAt == null ? 1 : Math.max(1, entry.expireAt - now());
        record.usedAt = nowArg;
        strings.set(codeKeyName, { value: JSON.stringify(record), expireAt: now() + ttl });

        return `OK${encoded}`;
      }

      return countWrong(keys, args);
    }

    function release(keys: string[]): number {
      const entry = liveString(keys[0]);
      if (!entry || entry.expireAt === null || entry.expireAt - now() < 1) {
        return 0;
      }

      const record = JSON.parse(entry.value) as { usedAt?: number };
      delete record.usedAt;
      strings.set(keys[0], { value: JSON.stringify(record), expireAt: entry.expireAt });

      return 1;
    }

    function count(keys: string[], args: Array<string | number>): number {
      const current = liveString(keys[0]);
      const next = Number(current?.value ?? '0') + 1;
      strings.set(keys[0], {
        value: String(next),
        expireAt: current ? current.expireAt : now() + Number(args[0]),
      });

      return next;
    }

    const cacheService = {
      cacheEnabled: sinon.stub().returns(cacheEnabled),
      get: sinon.stub().callsFake(async (key: string) => liveString(key)?.value ?? null),
      eval: sinon.stub().callsFake(async (_script: string, keys: string[], args: Array<string | number> = []) => {
        if (keys.length === 2) {
          return issue(keys, args);
        }
        if (keys.length === 3) {
          return redeem(keys, args);
        }
        if (args.length === 0) {
          return release(keys);
        }

        return count(keys, args);
      }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanVerificationCodeService(cacheService as never, logger as never);

    return { service, cacheService, strings };
  }

  async function expectInvalid(run: () => Promise<unknown>) {
    try {
      await run();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(UnauthorizedException);
      expect((err as UnauthorizedException).getResponse()).to.deep.include({ code: VERIFICATION_CODE_INVALID });
    }
  }

  async function expectTooMany(run: () => Promise<unknown>, retryAfterSeconds: number) {
    try {
      await run();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
      expect((err as HttpException).getResponse()).to.deep.include({
        code: VERIFICATION_CODE_TOO_MANY_TRIES,
        retryAfterSeconds,
      });
    }
  }

  it('issues a 6-digit code that redeems to the pending slot', async () => {
    const { service } = setup();
    const issued = await service.issue(payload());

    expect(issued.code).to.match(/^\d{6}$/);
    const redeemed = await service.redeem('Alice@Example.com', issued.code, '203.0.113.4');

    expect(redeemed.alreadyUsed).to.equal(false);
    expect(redeemed.payload).to.deep.include({ address: 'alice@example.com', requestedAt: payload().requestedAt });
  });

  it('treats a wrong code, an unknown code and a short code as the same invalid result', async () => {
    const { service, cacheService } = setup();
    const issued = await service.issue(payload());

    await expectInvalid(() => service.redeem('alice@example.com', '000000', '203.0.113.4'));
    await expectInvalid(() => service.redeem('alice@example.com', '12', '203.0.113.4'));
    expect(
      await service.redeem('alice@example.com', ` ${issued.code.slice(0, 3)}-${issued.code.slice(3)} `)
    ).to.include({ alreadyUsed: false });
    expect(cacheService.eval.callCount).to.be.greaterThan(1);
  });

  it('locks the pending slot after 10 wrong tries and leaves a resent code usable', async () => {
    const { service } = setup();
    const first = await service.issue(payload('2026-10-01T12:00:00.000Z'));

    for (let attempt = 0; attempt < HUMAN_VERIFICATION_CODE_MAX_SLOT_FAILURES - 1; attempt++) {
      await expectInvalid(() => service.redeem('alice@example.com', '000000', '203.0.113.4'));
    }

    await expectTooMany(() => service.redeem('alice@example.com', '000000', '203.0.113.4'), 0);
    await expectTooMany(() => service.redeem('alice@example.com', first.code, '203.0.113.4'), 0);

    const resent = await service.issue(payload('2026-10-01T13:00:00.000Z'));
    const redeemed = await service.redeem('alice@example.com', resent.code, '203.0.113.4');

    expect(redeemed.payload.requestedAt).to.equal('2026-10-01T13:00:00.000Z');
    expect(resent.code).to.not.equal(first.code);
  });

  it('stops an address that one network has already guessed too often', async () => {
    const { service, strings } = setup();
    await service.issue(payload());
    const addressFails = `human_verify_code_fail:{alice@example.com}:203.0.113.4`;
    strings.set(addressFails, {
      value: String(HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES - 1),
      expireAt: Math.floor(Date.now() / 1000) + 60,
    });

    await expectTooMany(
      () => service.redeem('alice@example.com', '000000', '203.0.113.4'),
      HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS
    );
    await expectTooMany(
      () => service.redeem('alice@example.com', '000000', '203.0.113.4'),
      HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS
    );
  });

  it('stops a network that has already guessed too often, before it spends the slot', async () => {
    const { service, strings } = setup();
    const issued = await service.issue(payload());
    strings.set(`human_verify_code_net:{203.0.113.9}`, {
      value: String(HUMAN_VERIFICATION_CODE_MAX_NETWORK_FAILURES),
      expireAt: Math.floor(Date.now() / 1000) + 60,
    });

    await expectTooMany(
      () => service.redeem('alice@example.com', issued.code, '203.0.113.9'),
      HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS
    );

    const redeemed = await service.redeem('alice@example.com', issued.code, '203.0.113.10');
    expect(redeemed.alreadyUsed).to.equal(false);
  });

  it('refuses to issue when the cache is off', async () => {
    const { service } = setup({ cacheEnabled: false });

    try {
      await service.issue(payload());
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ServiceUnavailableException);
    }
  });

  it('stores the code under the address it confirms', async () => {
    const { service, strings } = setup();
    const issued = await service.issue(payload());

    expect(strings.has(codeKey('alice@example.com', issued.code))).to.equal(true);
    expect(slotCounterKey('alice@example.com', { ...payload(), address: 'alice@example.com' })).to.include(
      'env-1:agent-1:alice:email:2026-10-01T12:00:00.000Z'
    );
  });
});
