import { expect } from 'chai';
import sinon from 'sinon';

import { CliDeviceSessionService } from './cli-device-session.service';

describe('CliDeviceSessionService', () => {
  function makeService() {
    const cacheService = {
      cacheEnabled: () => true,
      set: sinon.stub().resolves('OK'),
      get: sinon.stub().resolves(null),
      eval: sinon.stub().resolves(''),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const service = new CliDeviceSessionService(cacheService as any, logger as any);

    return { service, cacheService };
  }

  it('creates a pending device session in cache', async () => {
    const { service, cacheService } = makeService();

    const result = await service.create({ name: 'novu-connect' });

    expect(result.deviceCode).to.match(/^[A-Za-z0-9_-]+$/);
    expect(result.expiresIn).to.be.greaterThan(0);
    expect(result.interval).to.be.greaterThan(0);
    expect(cacheService.set.calledOnce).to.be.true;
  });

  it('returns pending while the dashboard has not approved yet', async () => {
    const { service, cacheService } = makeService();
    cacheService.eval.resolves('P');

    const result = await service.poll('device-code');

    expect(result.status).to.equal('pending');
  });

  it('returns approved credentials once and consumes the session', async () => {
    const { service, cacheService } = makeService();
    cacheService.eval.resolves(
      `A${JSON.stringify({
        status: 'approved',
        createdAt: new Date().toISOString(),
        apiKey: 'sk_test',
        environmentId: 'env_1',
      })}`
    );

    const result = await service.poll('device-code');

    expect(result.status).to.equal('approved');
    if (result.status === 'approved') {
      expect(result.apiKey).to.equal('sk_test');
      expect(result.environmentId).to.equal('env_1');
    }
  });

  it('marks missing sessions as expired', async () => {
    const { service, cacheService } = makeService();
    cacheService.eval.resolves('');

    const result = await service.poll('missing');

    expect(result.status).to.equal('expired');
  });
});
