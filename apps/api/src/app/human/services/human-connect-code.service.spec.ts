import { ServiceUnavailableException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { CONNECT_CODE_TTL_SECONDS, connectCodeKey, HumanConnectCodeService } from './human-connect-code.service';

describe('HumanConnectCodeService', () => {
  const owner = { environmentId: 'env1', organizationId: 'org1', agentId: 'relay1', keyFingerprint: 'key-1' };
  const target = { ...owner, agentIdentifier: 'human-relay', handle: 'atlas' };

  function setup({ cacheEnabled = true } = {}) {
    const store = new Map<string, string>();
    const cacheService = {
      cacheEnabled: sinon.stub().returns(cacheEnabled),
      get: sinon.stub().callsFake(async (key: string) => store.get(key) ?? null),
      set: sinon.stub().callsFake(async (key: string, value: string) => {
        store.set(key, value);

        return 'OK';
      }),
      setIfNotExist: sinon.stub().callsFake(async (key: string, value: string) => {
        if (store.has(key)) {
          return null;
        }
        store.set(key, value);

        return 'OK';
      }),
      eval: sinon.stub(),
      incr: sinon.stub(),
      del: sinon.stub(),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanConnectCodeService(cacheService as never, logger as never);

    /** A code as `issue` keeps it, `expiresIn` seconds from now, with the fields given on top. */
    function keep(code: string, { expiresIn = CONNECT_CODE_TTL_SECONDS, ...fields }: Record<string, unknown> = {}) {
      const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresIn);
      store.set(connectCodeKey('atlas', code), JSON.stringify({ ...target, expiresAt, ...fields }));

      return new Date(expiresAt * 1000).toISOString();
    }

    return { service, cacheService, store, keep };
  }

  describe('describe', () => {
    it('tells an unused code, taking it in any case or spacing', async () => {
      const { service, keep } = setup();
      const expiresAt = keep('BCDF-GHJK');

      expect(await service.describe(owner, 'atlas', 'bcdf ghjk')).to.deep.equal({
        code: 'BCDF-GHJK',
        status: 'unused',
        expiresAt,
      });
    });

    it('tells a used code with when it was used, even once its time ran out', async () => {
      const { service, keep } = setup();
      const usedAt = Math.floor(Date.now() / 1000) - 120;
      const expiresAt = keep('BCDF-GHJK', { expiresIn: -60, usedAt });

      expect(await service.describe(owner, 'atlas', 'BCDF-GHJK')).to.deep.equal({
        code: 'BCDF-GHJK',
        status: 'used',
        expiresAt,
        usedAt: new Date(usedAt * 1000).toISOString(),
      });
    });

    it('tells a code used in its last minutes as used', async () => {
      const { service, keep } = setup();
      keep('BCDF-GHJK', { expiresIn: 30, usedAt: Math.floor(Date.now() / 1000) });

      expect((await service.describe(owner, 'atlas', 'BCDF-GHJK'))?.status).to.equal('used');
    });

    it('tells a code that ran out unused as expired', async () => {
      const { service, keep } = setup();
      keep('BCDF-GHJK', { expiresIn: 0 });

      const state = await service.describe(owner, 'atlas', 'BCDF-GHJK');

      expect(state?.status).to.equal('expired');
      expect(state).to.not.have.property('usedAt');
    });

    it('tells a code made with a key that was replaced since as expired, used or not', async () => {
      const { service, keep } = setup();
      keep('BCDF-GHJK', { keyFingerprint: 'old-key' });
      keep('GHJK-BCDF', { keyFingerprint: 'old-key', usedAt: Math.floor(Date.now() / 1000) });

      expect((await service.describe(owner, 'atlas', 'BCDF-GHJK'))?.status).to.equal('expired');
      const used = await service.describe(owner, 'atlas', 'GHJK-BCDF');
      expect(used?.status).to.equal('expired');
      expect(used).to.not.have.property('usedAt');
    });

    it('tells nothing of a code that is another agent’s, environment’s or organization’s', async () => {
      const { service, keep } = setup();
      keep('BCDF-GHJK');

      for (const other of [{ agentId: 'relay2' }, { environmentId: 'env2' }, { organizationId: 'org2' }]) {
        expect(await service.describe({ ...owner, ...other }, 'atlas', 'BCDF-GHJK'), JSON.stringify(other)).to.equal(
          null
        );
      }
    });

    it('tells nothing of a code under another handle, one never made, or what can’t be a code', async () => {
      const { service, cacheService, keep } = setup();
      keep('BCDF-GHJK');

      expect(await service.describe(owner, 'not-atlas', 'BCDF-GHJK')).to.equal(null);
      expect(await service.describe(owner, 'atlas', 'GHJK-BCDF')).to.equal(null);

      cacheService.get.resetHistory();
      expect(await service.describe(owner, 'atlas', 'hello')).to.equal(null);
      expect(await service.describe(owner, 'Atlas Prime', 'BCDF-GHJK')).to.equal(null);
      expect(cacheService.get.called).to.equal(false);
    });

    it('only reads: asking is not a try, and the code stays as it was', async () => {
      const { service, cacheService, store, keep } = setup();
      keep('BCDF-GHJK');
      const before = new Map(store);

      await service.describe(owner, 'atlas', 'BCDF-GHJK');
      await service.describe(owner, 'atlas', 'GHJK-BCDF');

      expect(cacheService.eval.called).to.equal(false);
      expect(cacheService.set.called).to.equal(false);
      expect(cacheService.setIfNotExist.called).to.equal(false);
      expect(cacheService.incr.called).to.equal(false);
      expect(cacheService.del.called).to.equal(false);
      expect(store).to.deep.equal(before);
    });

    it('fails as unavailable without the cache', async () => {
      const { service } = setup({ cacheEnabled: false });

      const error = await service.describe(owner, 'atlas', 'BCDF-GHJK').catch((caught) => caught);

      expect(error).to.be.instanceOf(ServiceUnavailableException);
    });
  });

  describe('issue', () => {
    it('hands the same code back while it is unused, and a new one once the account key changed', async () => {
      const { service } = setup();

      const first = await service.issue(target);
      expect((await service.issue(target)).code).to.equal(first.code);

      const afterKeyChange = await service.issue({ ...target, keyFingerprint: 'key-2' });
      expect(afterKeyChange.code).to.not.equal(first.code);
      expect((await service.describe({ ...owner, keyFingerprint: 'key-2' }, 'atlas', first.code))?.status).to.equal(
        'expired'
      );
    });

    it('gives each host a code of its own, and keeps the host on it', async () => {
      const { service, store } = setup();

      const forClaudeCode = await service.issue({ ...target, host: 'claude-code' });
      const forHermes = await service.issue({ ...target, host: 'hermes' });
      const forNoHost = await service.issue(target);

      expect(new Set([forClaudeCode.code, forHermes.code, forNoHost.code]).size).to.equal(3);
      expect((await service.issue({ ...target, host: 'hermes' })).code).to.equal(forHermes.code);
      expect((await service.issue(target)).code).to.equal(forNoHost.code);
      expect(JSON.parse(store.get(connectCodeKey('atlas', forHermes.code)) ?? '{}').host).to.equal('hermes');
      expect(JSON.parse(store.get(connectCodeKey('atlas', forNoHost.code)) ?? '{}')).to.not.have.property('host');
    });
  });

  describe('redeem', () => {
    it('tells the host the code was made for, and leaves out one this API does not know', async () => {
      const { service, cacheService, store, keep } = setup();
      // As the script answers for a code that works: the record as it was kept.
      cacheService.eval.callsFake(async (_script: string, keys: string[]) => store.get(keys[0]) ?? 'INVALID');
      keep('BCDF-GHJK', { host: 'openclaw' });
      keep('GHJK-BCDF', { host: 'windsurf' });

      expect((await service.redeem('atlas', 'BCDF-GHJK')).host).to.equal('openclaw');

      const unknownHost = await service.redeem('atlas', 'GHJK-BCDF');
      expect(unknownHost).to.not.have.property('host');
      expect(unknownHost.agentId).to.equal('relay1');
    });
  });
});
