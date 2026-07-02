import { CLI_DEVICE_SESSION_NAME_NOVU_CONNECT } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { CliDeviceSessionNotFoundError, CliDeviceSessionService } from './cli-device-session.service';

describe('CliDeviceSessionService', () => {
  function pendingRecord(overrides: Record<string, unknown> = {}) {
    return JSON.stringify({
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdAtEpoch: Math.floor(Date.now() / 1000),
      sessionTtlSeconds: 300,
      slideTtlOnPoll: false,
      ...overrides,
    });
  }

  function makeService() {
    const cacheService = {
      cacheEnabled: () => true,
      set: sinon.stub().resolves('OK'),
      get: sinon.stub().resolves(null),
      del: sinon.stub().resolves(1),
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

  it('creates a longer pending session for novu connect', async () => {
    const { service, cacheService } = makeService();

    const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_NOVU_CONNECT });

    expect(result.expiresIn).to.equal(30 * 60);
    expect(cacheService.set.calledOnce).to.be.true;
    const setArgs = cacheService.set.firstCall.args;
    expect(setArgs[2]?.ttl).to.equal(30 * 60);
  });

  it('creates a pending device session in cache', async () => {
    const { service, cacheService } = makeService();

    const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_NOVU_CONNECT });

    expect(result.deviceCode).to.match(/^[A-Za-z0-9_-]+$/);
    expect(result.expiresIn).to.be.greaterThan(0);
    expect(result.interval).to.be.greaterThan(0);
    expect(cacheService.set.calledOnce).to.be.true;
  });

  it('returns pending while the dashboard has not approved yet', async () => {
    const { service, cacheService } = makeService();
    cacheService.eval.resolves('PENDING:300');

    const result = await service.poll('device-code');

    expect(result.status).to.equal('pending');
    if (result.status === 'pending') {
      expect(result.expiresIn).to.equal(300);
    }
    expect(cacheService.get.called).to.be.false;
    expect(cacheService.del.called).to.be.false;
  });

  it('returns approved credentials once and consumes the session', async () => {
    const { service, cacheService } = makeService();
    cacheService.eval.resolves(
      JSON.stringify({
        status: 'approved',
        createdAt: new Date().toISOString(),
        createdAtEpoch: Math.floor(Date.now() / 1000),
        sessionTtlSeconds: 300,
        slideTtlOnPoll: false,
        apiKey: 'sk_test',
        environmentId: 'env_1',
      })
    );

    const result = await service.poll('device-code');

    expect(result.status).to.equal('approved');
    if (result.status === 'approved') {
      expect(result.apiKey).to.equal('sk_test');
      expect(result.environmentId).to.equal('env_1');
    }
  });

  it('marks missing sessions as expired', async () => {
    const { service } = makeService();

    const result = await service.poll('missing');

    expect(result.status).to.equal('expired');
  });

  it('throws when approving a missing session', async () => {
    const { service } = makeService();

    try {
      await service.approve({
        deviceCode: 'missing',
        approvedByUserId: 'user_1',
        apiKey: 'sk_test',
        environmentId: 'env_1',
      });
      expect.fail('Expected approve to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(CliDeviceSessionNotFoundError);
    }
  });
});
