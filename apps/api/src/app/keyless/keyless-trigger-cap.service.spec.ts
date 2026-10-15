import { CacheService, PinoLogger } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';

import { KEYLESS_DAILY_COUNTER_TTL_SECONDS } from './keyless-abuse.constants';
import { KeylessTriggerCapService } from './keyless-trigger-cap.service';

describe('KeylessTriggerCapService', () => {
  let originalCap: string | undefined;
  let cacheService: sinon.SinonStubbedInstance<CacheService>;
  let service: KeylessTriggerCapService;

  beforeEach(() => {
    originalCap = process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY;
    delete process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY;
    cacheService = sinon.createStubInstance(CacheService);
    cacheService.cacheEnabled.returns(true);
    service = new KeylessTriggerCapService(cacheService, sinon.createStubInstance(PinoLogger) as unknown as PinoLogger);
  });

  afterEach(() => {
    if (originalCap === undefined) {
      delete process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY;
    } else {
      process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY = originalCap;
    }
    sinon.restore();
  });

  it('adds the cost to a per-environment daily counter within the default cap', async () => {
    cacheService.eval.resolves(3);

    expect(await service.consume('env-1', 3)).to.deep.equal({ allowed: true, cap: 200 });

    const [, keys, args] = cacheService.eval.firstCall.args;
    expect(keys).to.have.length(1);
    expect(keys[0]).to.match(/^keyless:agent_trigger:\d{4}-\d{2}-\d{2}:\{env-1\}$/);
    expect(args).to.deep.equal([3, 200, KEYLESS_DAILY_COUNTER_TTL_SECONDS]);
  });

  it('reads the cap at call time', async () => {
    process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY = '5';
    cacheService.eval.resolves(5);

    expect(await service.consume('env-1', 5)).to.deep.equal({ allowed: true, cap: 5 });
    expect(cacheService.eval.firstCall.args[2][1]).to.equal(5);
  });

  it('rejects when the script reports the cap would be exceeded', async () => {
    cacheService.eval.resolves(-1);

    expect(await service.consume('env-1', 201)).to.deep.equal({ allowed: false, cap: 200 });
  });

  it('fails open when the cache errors', async () => {
    cacheService.eval.rejects(new Error('redis down'));

    expect((await service.consume('env-1', 1)).allowed).to.equal(true);
  });

  it('fails open when the cache is disabled', async () => {
    cacheService.cacheEnabled.returns(false);

    expect((await service.consume('env-1', 1)).allowed).to.equal(true);
    expect(cacheService.eval.called).to.equal(false);
  });

  it('skips metering when the cap is 0 or the cost is 0', async () => {
    expect((await service.consume('env-1', 0)).allowed).to.equal(true);
    process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY = '0';
    expect((await service.consume('env-1', 10)).allowed).to.equal(true);
    expect(cacheService.eval.called).to.equal(false);
  });
});
