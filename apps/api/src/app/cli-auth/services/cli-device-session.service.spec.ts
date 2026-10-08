import {
  CLI_DEVICE_SESSION_NAME_HUMAN_CLI,
  CLI_DEVICE_SESSION_NAME_NOVU_CONNECT,
  CLI_USER_CODE_PATTERN,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  CLI_MACHINE_NAME_MAX_LENGTH,
  CliDeviceSessionBeingApprovedError,
  CliDeviceSessionNotFoundError,
  CliDeviceSessionService,
} from './cli-device-session.service';

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

    return { service, cacheService, logger };
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
    const originalDashboardUrl = process.env.HUMAN_DASHBOARD_URL;
    const originalRegion = process.env.NOVU_REGION;

    afterEach(() => {
      restoreEnv('HUMAN_DASHBOARD_URL', originalDashboardUrl);
      restoreEnv('NOVU_REGION', originalRegion);
    });

    function restoreEnv(name: string, value: string | undefined) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }

    it('send the CLI to the Human dashboard with the code to compare there, and wait as long as novu connect', async () => {
      process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md/';
      delete process.env.NOVU_REGION;
      const { service, cacheService } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI });

      expect(result.expiresIn).to.equal(30 * 60);
      expect(result.userCode).to.match(CLI_USER_CODE_PATTERN);
      // The link shows the user code; the device code the CLI polls with stays out of it.
      expect(result.verificationUrl).to.equal(`https://gethuman.md/cli/login?code=${result.userCode}`);
      expect(result.verificationUrl).not.to.contain(result.deviceCode);
      expect(cacheService.setIfNotExist.firstCall.args.slice(0, 2)).to.deep.equal([
        `cli-device-session-user-code:${result.userCode}`,
        result.deviceCode,
      ]);
      expect(JSON.parse(cacheService.set.firstCall.args[1]).userCode).to.equal(result.userCode);
      // The code outlasts the longest a polling CLI can keep the session waiting, with no TTL jitter.
      expect(cacheService.setIfNotExist.firstCall.args[2]).to.deep.equal({ ttl: 60 * 60 + 30 * 60, jitter: false });
    });

    it('pick another code when one is taken', async () => {
      process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md';
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

      expect(await service.getPendingByUserCode('BCDF-GHJK')).to.deep.equal({ deviceCode: 'device-code' });
      expect(await service.getPendingByUserCode('BCDF-GHJL')).to.equal(null);

      cacheService.get
        .withArgs('cli-device-session:device-code')
        .resolves(pendingRecord({ userCode: 'BCDF-GHJK', status: 'approved' }));
      expect(await service.getPendingByUserCode('BCDF-GHJK')).to.equal(null);
    });

    it('keep the name of the computer as one short line of visible text', async () => {
      process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md';
      const { service, cacheService } = makeService();
      const stored = () => JSON.parse(cacheService.set.lastCall.args[1]).machineName;

      await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI, machineName: '  adas-macbook-pro \n' });
      expect(stored()).to.equal('adas-macbook-pro');

      // Line breaks, control characters and bidi overrides can't dress the name up as something else.
      await service.create({
        name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI,
        machineName: 'your\u202Eretupmoc\u0000\r\n\tApprove <b>now</b>',
      });
      expect(stored()).to.equal('your retupmoc Approve <b>now</b>');

      await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI, machineName: 'x'.repeat(500) });
      expect(stored()).to.have.length(CLI_MACHINE_NAME_MAX_LENGTH);

      await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI, machineName: ' \u200B ' });
      expect(stored()).to.equal(undefined);
    });

    it('show the page the computer they wait on, while they wait', async () => {
      const { service, cacheService } = makeService();
      cacheService.get.withArgs('cli-device-session-user-code:BCDF-GHJK').resolves('device-code');
      cacheService.get
        .withArgs('cli-device-session:device-code')
        .resolves(pendingRecord({ userCode: 'BCDF-GHJK', machineName: 'adas-macbook-pro' }));

      expect(await service.getPendingByUserCode('BCDF-GHJK')).to.deep.equal({
        deviceCode: 'device-code',
        machineName: 'adas-macbook-pro',
      });
      expect(await service.getPendingByUserCode('BCDF-GHJL')).to.equal(null);
    });

    it('end when denied: the code stops working and the record holds no key', async () => {
      const { service, cacheService } = makeService();
      cacheService.get.withArgs('cli-device-session-user-code:BCDF-GHJK').resolves('device-code');
      cacheService.get.withArgs('cli-device-session:device-code').resolves(pendingRecord({ userCode: 'BCDF-GHJK' }));
      cacheService.eval.resolves(1);

      expect(await service.denyByUserCode('BCDF-GHJK')).to.equal(true);

      const [script, keys, args] = cacheService.eval.firstCall.args;
      // Only a session that is still pending is replaced, in one step, so a denial can't undo an approval.
      expect(script).to.contain("payload.status ~= 'pending'");
      expect(keys).to.deep.equal(['cli-device-session:device-code']);
      const denied = JSON.parse(args[1]);
      expect(denied.status).to.equal('denied');
      expect(denied).not.to.have.property('apiKey');

      // Once denied, the code finds nothing to approve or deny.
      cacheService.get.withArgs('cli-device-session:device-code').resolves(JSON.stringify(denied));
      expect(await service.getPendingByUserCode('BCDF-GHJK')).to.equal(null);
      expect(await service.holdForApprovalByUserCode('BCDF-GHJK')).to.equal(null);
      expect(await service.denyByUserCode('BCDF-GHJK')).to.equal(false);
    });

    it('are not denied once they were approved or ran out', async () => {
      const { service, cacheService } = makeService();

      expect(await service.denyByUserCode('BCDF-GHJK')).to.equal(false);

      // Approved between the lookup and the write: the script refuses.
      cacheService.get.withArgs('cli-device-session-user-code:BCDF-GHJK').resolves('device-code');
      cacheService.get.withArgs('cli-device-session:device-code').resolves(pendingRecord({ userCode: 'BCDF-GHJK' }));
      cacheService.eval.resolves(0);

      expect(await service.denyByUserCode('BCDF-GHJK')).to.equal(false);
    });

    it('are held for one approval, and given back when it fails', async () => {
      const { service, cacheService } = makeService();
      cacheService.get.withArgs('cli-device-session-user-code:BCDF-GHJK').resolves('device-code');
      cacheService.get.withArgs('cli-device-session:device-code').resolves(pendingRecord({ userCode: 'BCDF-GHJK' }));
      cacheService.eval.resolves(1);

      const hold = await service.holdForApprovalByUserCode('BCDF-GHJK');
      if (!hold) {
        throw new Error('Expected the session to be held');
      }

      const [, holdKeys, holdArgs] = cacheService.eval.firstCall.args;
      const held = JSON.parse(holdArgs[1]);
      expect(hold).to.deep.equal({ deviceCode: 'device-code', holdId: held.approvalHoldId });
      expect(hold.holdId).to.match(/^[A-Za-z0-9_-]{16}$/);
      expect(holdKeys).to.deep.equal(['cli-device-session:device-code']);
      // Still pending: the CLI keeps polling and the page keeps showing it. Unrenewed, the hold ends in a minute.
      expect(held.status).to.equal('pending');
      expect(held.approvalHeldUntilEpoch - holdArgs[2]).to.be.closeTo(60, 1);
      expect(holdArgs[0]).to.equal(300);

      // Given back: the session is written without the hold, and only where this hold is still the one on it.
      cacheService.get.withArgs('cli-device-session:device-code').resolves(holdArgs[1]);
      await service.releaseApprovalHold(hold);

      const [releaseScript, releaseKeys, releaseArgs] = cacheService.eval.secondCall.args;
      expect(releaseScript).to.contain('payload.approvalHoldId ~= ARGV[3]');
      expect(releaseKeys).to.deep.equal(['cli-device-session:device-code']);
      expect(JSON.parse(releaseArgs[1])).to.deep.include({ status: 'pending', userCode: 'BCDF-GHJK' });
      expect(JSON.parse(releaseArgs[1])).not.to.have.any.keys('approvalHoldId', 'approvalHeldUntilEpoch');
      expect(releaseArgs[2]).to.equal(hold.holdId);
    });

    it('stay held for the same approval when it renews its hold', async () => {
      const { service, cacheService } = makeService();
      const hold = { deviceCode: 'device-code', holdId: 'this-approval' };
      const lastMinute = Math.floor(Date.now() / 1000) - 60;
      // Held a while ago, so the hold is about to run out, or just did with nobody taking the session since.
      cacheService.get.withArgs('cli-device-session:device-code').resolves(
        pendingRecord({
          userCode: 'BCDF-GHJK',
          approvalHoldId: 'this-approval',
          approvalHeldUntilEpoch: lastMinute,
        })
      );
      cacheService.eval.resolves(1);

      expect(await service.renewApprovalHold(hold)).to.equal(true);

      const [script, keys, args] = cacheService.eval.firstCall.args;
      // Only the approval the hold belongs to renews it, and how long the session lives is left alone.
      expect(script).to.contain('payload.approvalHoldId ~= ARGV[3]');
      expect(script).to.contain("redis.call('pttl', KEYS[1])");
      expect(keys).to.deep.equal(['cli-device-session:device-code']);
      const renewed = JSON.parse(args[1]);
      expect(renewed).to.deep.include({ status: 'pending', userCode: 'BCDF-GHJK', approvalHoldId: 'this-approval' });
      expect(renewed.approvalHeldUntilEpoch - lastMinute).to.be.closeTo(120, 1);
      expect(args[2]).to.equal('this-approval');
    });

    it('are no longer held for an approval once they were answered, ran out or went to another approval', async () => {
      const { service, cacheService } = makeService();
      const hold = { deviceCode: 'device-code', holdId: 'this-approval' };

      // Ran out: nothing to renew.
      expect(await service.renewApprovalHold(hold)).to.equal(false);
      expect(cacheService.eval.called).to.equal(false);

      // Denied, approved or held by another approval since: the script refuses.
      cacheService.get.withArgs('cli-device-session:device-code').resolves(pendingRecord({ userCode: 'BCDF-GHJK' }));
      cacheService.eval.resolves(0);
      expect(await service.renewApprovalHold(hold)).to.equal(false);
    });

    describe('while an approval is at work', () => {
      let clock: sinon.SinonFakeTimers;
      const hold = { deviceCode: 'device-code', holdId: 'this-approval' };

      beforeEach(() => {
        clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['setInterval', 'clearInterval', 'Date'] });
      });

      afterEach(() => {
        clock.restore();
      });

      function heldSession() {
        const made = makeService();
        made.cacheService.get
          .withArgs('cli-device-session:device-code')
          .resolves(pendingRecord({ userCode: 'BCDF-GHJK', approvalHoldId: 'this-approval' }));
        made.cacheService.eval.resolves(1);

        return made;
      }

      function slowWork() {
        let finish: (value: string) => void = () => undefined;
        let fail: (error: Error) => void = () => undefined;
        const work = new Promise<string>((resolve, reject) => {
          finish = resolve;
          fail = reject;
        });

        return { work: () => work, finish, fail };
      }

      it('have their hold renewed until the work is done, however long it takes', async () => {
        const { service, cacheService } = heldSession();
        const { work, finish } = slowWork();

        const result = service.whileRenewingApprovalHold(hold, work);
        expect(cacheService.eval.callCount).to.equal(0);

        // Three times the hold's own minute: without the renewals it would have run out long ago.
        await clock.tickAsync(180_000);
        expect(cacheService.eval.callCount).to.equal(9);
        const heldUntil = cacheService.eval.args.map(([, , args]) => JSON.parse(args[1]).approvalHeldUntilEpoch);
        expect(heldUntil[8] - heldUntil[0]).to.equal(160);
        expect(cacheService.eval.args.every(([, , args]) => args[2] === 'this-approval')).to.equal(true);

        finish('approved');
        expect(await result).to.equal('approved');

        await clock.tickAsync(180_000);
        expect(cacheService.eval.callCount).to.equal(9);
      });

      it('stop being renewed when the work fails, and pass the failure on', async () => {
        const { service, cacheService } = heldSession();
        const { work, fail } = slowWork();

        const result = service.whileRenewingApprovalHold(hold, work).catch((caught) => caught);
        await clock.tickAsync(20_000);
        fail(new Error('The setup cannot be kept'));

        expect((await result).message).to.equal('The setup cannot be kept');
        await clock.tickAsync(180_000);
        expect(cacheService.eval.callCount).to.equal(1);
      });

      it("stop being renewed once the hold is no longer this approval's", async () => {
        const { service, cacheService } = heldSession();
        const { work, finish } = slowWork();
        cacheService.eval.onSecondCall().resolves(0);

        const result = service.whileRenewingApprovalHold(hold, work);
        await clock.tickAsync(180_000);

        expect(cacheService.eval.callCount).to.equal(2);
        finish('done');
        await result;
      });

      it('keep being renewed after a renewal that failed', async () => {
        const { service, cacheService, logger } = heldSession();
        const { work, finish } = slowWork();
        cacheService.eval.onFirstCall().rejects(new Error('Redis is down'));

        const result = service.whileRenewingApprovalHold(hold, work);
        await clock.tickAsync(40_000);

        expect(cacheService.eval.callCount).to.equal(2);
        expect(logger.warn.calledOnce).to.equal(true);
        finish('done');
        await result;
      });
    });

    it('are not denied or held again while an approval holds them', async () => {
      const { service, cacheService } = makeService();
      cacheService.get.withArgs('cli-device-session-user-code:BCDF-GHJK').resolves('device-code');
      cacheService.get.withArgs('cli-device-session:device-code').resolves(pendingRecord({ userCode: 'BCDF-GHJK' }));
      // What the script answers for a pending session whose hold hasn't run out.
      cacheService.eval.resolves(2);

      const denial = await service.denyByUserCode('BCDF-GHJK').catch((caught) => caught);
      const secondHold = await service.holdForApprovalByUserCode('BCDF-GHJK').catch((caught) => caught);

      expect(denial).to.be.instanceOf(CliDeviceSessionBeingApprovedError);
      expect(secondHold).to.be.instanceOf(CliDeviceSessionBeingApprovedError);
      // One script decides both, from the hold kept with the session and the time it is given.
      const [denyScript, , denyArgs] = cacheService.eval.firstCall.args;
      expect(denyScript).to.equal(cacheService.eval.secondCall.args[0]);
      expect(denyScript).to.contain('(tonumber(payload.approvalHeldUntilEpoch) or 0) > tonumber(ARGV[3])');
      expect(denyArgs[2]).to.be.closeTo(Date.now() / 1000, 2);
    });

    it('tell the waiting CLI they were denied', async () => {
      const { service, cacheService } = makeService();
      cacheService.eval.resolves('DENIED');

      expect(await service.poll('device-code')).to.deep.equal({ status: 'denied' });
    });

    it('carry the EU region from EU deployments', async () => {
      process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md';
      process.env.NOVU_REGION = 'eu-central-1';
      const { service } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI });

      const params = new URL(result.verificationUrl ?? '').searchParams;
      expect(params.get('region')).to.equal('eu');
      expect(params.get('code')).to.equal(result.userCode);
    });

    it('have no page to open where the Human dashboard is not configured', async () => {
      delete process.env.HUMAN_DASHBOARD_URL;
      const { service } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_HUMAN_CLI });

      expect(result).not.to.have.property('verificationUrl');
      expect(result).not.to.have.property('userCode');
    });

    it('leave other CLIs on the dashboard', async () => {
      process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md';
      const { service, cacheService } = makeService();

      const result = await service.create({ name: CLI_DEVICE_SESSION_NAME_NOVU_CONNECT });

      expect(result).not.to.have.property('verificationUrl');
      expect(result).not.to.have.property('userCode');
      expect(cacheService.setIfNotExist.called).to.equal(false);
      expect(JSON.parse(cacheService.set.firstCall.args[1])).not.to.have.property('machineName');
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
