import { expect } from 'chai';
import sinon from 'sinon';
import {
  extractWhatsAppBindCode,
  WHATSAPP_BIND_CODE_MAX_FAILURES,
  WHATSAPP_BIND_CODE_TTL_SECONDS,
  WhatsAppBindCodeService,
} from './whatsapp-bind-code.service';

const PAYLOAD = {
  environmentId: 'env1',
  organizationId: 'org1',
  integrationId: 'integration1',
  agentIdentifier: 'human-relay',
  subscriberId: 'ada',
};

describe('extractWhatsAppBindCode', () => {
  it('finds the code in the message the wa.me link pre-fills', () => {
    expect(extractWhatsAppBindCode('Connect me to ada: BCDF-GHJK')).to.equal('BCDFGHJK');
  });

  it('takes a code typed by hand, in any case and without the dash', () => {
    expect(extractWhatsAppBindCode('bcdf-ghjk')).to.equal('BCDFGHJK');
    expect(extractWhatsAppBindCode('  bcdfghjk ')).to.equal('BCDFGHJK');
  });

  it('finds no code in ordinary messages', () => {
    for (const text of [
      'yes, approve the deploy',
      'Thanks! See you tomorrow',
      'BCDF-GHJKL',
      'XBCDFGHJK',
      'BCDF-GHJA',
      'ABCD-EFGH',
      '',
      undefined,
    ]) {
      expect(extractWhatsAppBindCode(text), String(text)).to.equal(null);
    }
  });
});

describe('WhatsAppBindCodeService', () => {
  function makeService({ cacheEnabled = true } = {}) {
    const store = new Map<string, string>();
    const cacheService = {
      cacheEnabled: () => cacheEnabled,
      setIfNotExist: sinon.stub().callsFake(async (key: string, value: string) => {
        if (store.has(key)) {
          return null;
        }
        store.set(key, value);

        return 'OK';
      }),
      get: sinon.stub().callsFake(async (key: string) => store.get(key) ?? null),
      eval: sinon.stub().callsFake(async (script: string, keys: string[]) => {
        const [key] = keys;
        if (script.includes("'incr'")) {
          const next = Number(store.get(key) ?? 0) + 1;
          store.set(key, String(next));

          return next;
        }

        const value = store.get(key) ?? null;
        store.delete(key);

        return value;
      }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };

    return { service: new WhatsAppBindCodeService(cacheService as never, logger as never), cacheService, store };
  }

  it('issues a typeable code that works once, for ten minutes, on its business number only', async () => {
    const { service, cacheService } = makeService();

    const { code, expiresAt } = await service.issue(PAYLOAD);

    expect(code).to.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
    expect(new Date(expiresAt).getTime()).to.be.greaterThan(Date.now());
    const [key, , options] = cacheService.setIfNotExist.firstCall.args;
    expect(key).to.equal(`agent-inbox-whatsapp-code:integration1:${code.replace('-', '')}`);
    expect(options).to.deep.equal({ ttl: WHATSAPP_BIND_CODE_TTL_SECONDS });

    const bare = code.replace('-', '');
    expect(await service.consume('integration2', bare, '+15550100199')).to.deep.equal({ status: 'missing' });
    expect(await service.consume('integration1', bare, '+15550100199')).to.deep.equal({
      status: 'consumed',
      payload: PAYLOAD,
    });
    expect(await service.consume('integration1', bare, '+15550100199')).to.deep.equal({ status: 'missing' });
  });

  it('makes a new code when one is already taken', async () => {
    const { service, cacheService } = makeService();
    cacheService.setIfNotExist.onFirstCall().resolves(null);

    await service.issue(PAYLOAD);

    expect(cacheService.setIfNotExist.callCount).to.equal(2);
  });

  it('refuses to make codes without the cache', async () => {
    const { service } = makeService({ cacheEnabled: false });

    const error = await service.issue(PAYLOAD).catch((err: unknown) => err);

    expect((error as { getStatus: () => number }).getStatus()).to.equal(503);
  });

  it('stops a number that sends too many wrong codes, right ones included', async () => {
    const { service } = makeService();
    const { code } = await service.issue(PAYLOAD);

    for (let i = 0; i < WHATSAPP_BIND_CODE_MAX_FAILURES; i += 1) {
      expect(await service.consume('integration1', 'BBBBBBBB', '+15550100199')).to.deep.equal({ status: 'missing' });
    }

    expect(await service.consume('integration1', code.replace('-', ''), '+15550100199')).to.deep.equal({
      status: 'too_many_tries',
    });
    // Another number is not held up by the first one's guesses.
    expect((await service.consume('integration1', code.replace('-', ''), '+15550100200')).status).to.equal('consumed');
  });
});
