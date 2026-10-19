import { HttpException, HttpStatus, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  codeKey,
  HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS,
  HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES,
  HUMAN_VERIFICATION_CODE_MAX_NETWORK_FAILURES,
  HumanVerificationCodeService,
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

    function redeem(keys: string[], args: Array<string | number>): string {
      const [codeKeyName, addressFails] = keys;
      const [nowArg, maxAddress, window] = args.map(Number);
      const already = Number(liveString(addressFails)?.value ?? '0');
      if (already >= maxAddress) {
        return 'BLOCKED';
      }

      const raw = liveString(codeKeyName)?.value;
      let record: { payload?: unknown; expiresAt?: number; usedAt?: number } | null = null;
      if (raw) {
        try {
          record = JSON.parse(raw);
        } catch {
          record = null;
        }
      }

      if (record?.payload && Number(record.expiresAt) > nowArg) {
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

      const current = liveString(addressFails);
      const next = Number(current?.value ?? '0') + 1;
      strings.set(addressFails, {
        value: String(next),
        expireAt: current ? current.expireAt : now() + window,
      });
      if (next >= maxAddress) {
        return 'TOO_MANY';
      }

      return 'INVALID';
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
      setIfNotExist: sinon.stub().callsFake(async (key: string, value: string, options?: { ttl?: number }) => {
        if (liveString(key)) {
          return null;
        }

        strings.set(key, { value, expireAt: now() + Number(options?.ttl ?? 0) });

        return 'OK';
      }),
      eval: sinon.stub().callsFake(async (_script: string, keys: string[], args: Array<string | number> = []) => {
        if (keys.length === 2) {
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

  const TOO_MANY_BODY = {
    code: VERIFICATION_CODE_TOO_MANY_TRIES,
    message: 'Too many wrong codes from this network. Wait a few minutes, then try the code from the email.',
    retryAfterSeconds: HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS,
  };

  async function expectTooMany(run: () => Promise<unknown>) {
    try {
      await run();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
      expect((err as HttpException).getResponse()).to.deep.equal(TOO_MANY_BODY);
    }
  }

  async function refusal(run: () => Promise<unknown>): Promise<{ status: number; body: unknown }> {
    try {
      await run();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);

      return { status: (err as HttpException).getStatus(), body: (err as HttpException).getResponse() };
    }

    throw new Error('unreachable');
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

  it('stops one network after 10 wrong tries and leaves the code usable from another', async () => {
    const { service } = setup();
    const first = await service.issue(payload('2026-10-01T12:00:00.000Z'));
    const other = await service.issue({
      ...payload('2026-10-01T13:00:00.000Z'),
      env: 'env-2',
      agentId: 'agent-2',
    });
    const wrong = first.code === '000000' || other.code === '000000' ? '000001' : '000000';

    for (let attempt = 0; attempt < HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES - 1; attempt++) {
      await expectInvalid(() => service.redeem('alice@example.com', wrong, '203.0.113.4'));
    }

    await expectTooMany(() => service.redeem('alice@example.com', wrong, '203.0.113.4'));
    await expectTooMany(() => service.redeem('alice@example.com', first.code, '203.0.113.4'));

    const redeemed = await service.redeem('alice@example.com', first.code, '203.0.113.10');
    const redeemedOther = await service.redeem('alice@example.com', other.code, '203.0.113.10');

    expect(redeemed.payload).to.include({ env: 'env-1', requestedAt: '2026-10-01T12:00:00.000Z' });
    expect(redeemedOther.payload).to.include({ env: 'env-2', agentId: 'agent-2' });
  });

  it('refuses a wrong code the same way whether or not one is pending', async () => {
    const pending = setup();
    const absent = setup();
    const issued = await pending.service.issue(payload());
    const wrong = issued.code === '000000' ? '000001' : '000000';

    const withCode: Array<{ status: number; body: unknown }> = [];
    const withoutCode: Array<{ status: number; body: unknown }> = [];
    for (let attempt = 0; attempt < HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES + 1; attempt++) {
      withCode.push(await refusal(() => pending.service.redeem('alice@example.com', wrong, '203.0.113.4')));
      withoutCode.push(await refusal(() => absent.service.redeem('alice@example.com', wrong, '203.0.113.4')));
    }

    expect(withCode).to.deep.equal(withoutCode);
    expect(withCode[HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES - 1]).to.deep.equal({
      status: HttpStatus.TOO_MANY_REQUESTS,
      body: TOO_MANY_BODY,
    });
    expect(withCode.at(-1)).to.deep.equal(withCode.at(-2));
  });

  it('stops an address that one network has already guessed too often', async () => {
    const { service, strings } = setup();
    await service.issue(payload());
    const addressFails = `human_verify_code_fail:{alice@example.com}:203.0.113.4`;
    strings.set(addressFails, {
      value: String(HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES - 1),
      expireAt: Math.floor(Date.now() / 1000) + 60,
    });

    await expectTooMany(() => service.redeem('alice@example.com', '000000', '203.0.113.4'));
    await expectTooMany(() => service.redeem('alice@example.com', '000000', '203.0.113.4'));
  });

  it('stops a network that has already guessed too often, before it spends a code', async () => {
    const { service, strings } = setup();
    const issued = await service.issue(payload());
    strings.set(`human_verify_code_net:{203.0.113.9}`, {
      value: String(HUMAN_VERIFICATION_CODE_MAX_NETWORK_FAILURES),
      expireAt: Math.floor(Date.now() / 1000) + 60,
    });

    await expectTooMany(() => service.redeem('alice@example.com', issued.code, '203.0.113.9'));

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
    expect(JSON.parse(strings.get(codeKey('alice@example.com', issued.code))?.value ?? '{}').payload).to.include({
      env: 'env-1',
      address: 'alice@example.com',
    });
  });
});
