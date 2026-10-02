import {
  CLI_DEVICE_SESSION_NAME_HUMAN_CLI,
  CLI_DEVICE_SESSION_NAME_NOVU_CONNECT,
  CLI_USER_CODE_PATTERN,
} from '@novu/shared';
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
      setIfNotExist: sinon.stub().resolves('OK'),
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

  describe('human login sessions', () => {
    const originalWebsiteUrl = process.env.HUMAN_WEBSITE_URL;
    const originalRegion = process.env.NOVU_REGION;

    afterEach(() => {
      restoreEnv('HUMAN_WEBSITE_URL', originalWebsiteUrl);
      restoreEnv('NOVU_REGION', originalRegion);
    });

    function restoreEnv(name: string, value: string | undefined) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }

    it('send the CLI to the Human website with a code to type there, and wait as long as novu connect', async () => {
      process.env.HUMAN_WEBSITE_URL = 'https://gethuman.md/';
      delete process.env.NOVU_REGION;
      const { service, cacheService } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI });

      expect(result.expiresIn).to.equal(30 * 60);
      expect(result.userCode).to.match(CLI_USER_CODE_PATTERN);
      // The device code the CLI polls with stays out of the link.
      expect(result.verificationUrl).to.equal('https://gethuman.md/cli/login');
      expect(cacheService.setIfNotExist.firstCall.args.slice(0, 2)).to.deep.equal([
        `cli-device-session-user-code:${result.userCode}`,
        result.deviceCode,
      ]);
      expect(JSON.parse(cacheService.set.firstCall.args[1]).userCode).to.equal(result.userCode);
    });

    it('pick another code when one is taken', async () => {
      process.env.HUMAN_WEBSITE_URL = 'https://gethuman.md';
      const { service, cacheService } = makeService();
      cacheService.setIfNotExist.onFirstCall().resolves(null);

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI });

      expect(cacheService.setIfNotExist.callCount).to.equal(2);
      expect(result.userCode).to.equal(cacheService.setIfNotExist.secondCall.args[0].split(':').pop());
    });

    it('are found by their code only while they wait for approval', async () => {
      const { service, cacheService } = makeService();
      cacheService.get.withArgs('cli-device-session-user-code:BCDF-GHJK').resolves('device-code');
      cacheService.get.withArgs('cli-device-session:device-code').resolves(pendingRecord({ userCode: 'BCDF-GHJK' }));

      expect(await service.findPendingByUserCode('BCDF-GHJK')).to.equal('device-code');
      expect(await service.findPendingByUserCode('BCDF-GHJL')).to.equal(null);

      cacheService.get
        .withArgs('cli-device-session:device-code')
        .resolves(pendingRecord({ userCode: 'BCDF-GHJK', status: 'approved' }));
      expect(await service.findPendingByUserCode('BCDF-GHJK')).to.equal(null);
    });

    it('carry the EU region from EU deployments', async () => {
      process.env.HUMAN_WEBSITE_URL = 'https://gethuman.md';
      process.env.NOVU_REGION = 'eu-central-1';
      const { service } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI });

      expect(new URL(result.verificationUrl ?? '').searchParams.get('region')).to.equal('eu');
    });

    it('have no page to open where the Human website is not configured', async () => {
      delete process.env.HUMAN_WEBSITE_URL;
      const { service } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI });

      expect(result).not.to.have.property('verificationUrl');
      expect(result).not.to.have.property('userCode');
    });

    it('leave other CLIs on the dashboard', async () => {
      process.env.HUMAN_WEBSITE_URL = 'https://gethuman.md';
      const { service, cacheService } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_NOVU_CONNECT });

      expect(result).not.to.have.property('verificationUrl');
      expect(result).not.to.have.property('userCode');
      expect(cacheService.setIfNotExist.called).to.equal(false);
    });
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
