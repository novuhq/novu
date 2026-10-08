import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { CliDeviceSessionBeingApprovedError } from '../../../cli-auth/services/cli-device-session.service';
import { ApproveHumanCliLoginCommand } from './approve-human-cli-login.command';
import {
  ApproveHumanCliLogin,
  CLAIM_FAILED_CODE,
  CLI_LOGIN_BEING_APPROVED_CODE,
  CLI_LOGIN_NOT_FOUND_CODE,
} from './approve-human-cli-login.usecase';

describe('ApproveHumanCliLogin', () => {
  const account = { organizationId: 'novu_org', userId: 'novu_user', environmentId: 'dev_env', region: 'us' };
  const hold = { deviceCode: 'device_code', holdId: 'this_approval' };

  function setup() {
    const cliDeviceSessionService = {
      holdForApprovalByUserCode: sinon.stub().resolves(hold),
      renewApprovalHold: sinon.stub().resolves(true),
      // Renewing on a timer has its own tests; here the work just runs.
      whileRenewingApprovalHold: sinon.spy((_hold: unknown, work: () => Promise<unknown>) => work()),
      releaseApprovalHold: sinon.stub().resolves(),
    };
    const ensureBackingOrganization = { execute: sinon.stub().resolves(account) };
    const claimKeylessConnect = { execute: sinon.stub().resolves({ environmentId: 'dev_env' }) };
    const getDecryptedSecretKey = { execute: sinon.stub().resolves('sk_test') };
    const approveCliDeviceSession = { execute: sinon.stub().resolves({ ok: true }) };
    // Stands aside: whether an untouched agent is replaced has its own tests.
    const humanAccountAgent = {
      claimOverUntouchedAgent: (_account: unknown, _name: unknown, claim: () => Promise<unknown>) => claim(),
    };

    const usecase = new ApproveHumanCliLogin(
      cliDeviceSessionService as never,
      ensureBackingOrganization as never,
      claimKeylessConnect as never,
      getDecryptedSecretKey as never,
      approveCliDeviceSession as never,
      humanAccountAgent as never
    );

    return {
      usecase,
      cliDeviceSessionService,
      ensureBackingOrganization,
      claimKeylessConnect,
      getDecryptedSecretKey,
      approveCliDeviceSession,
    };
  }

  function command(overrides: { claimToken?: string } = {}) {
    return ApproveHumanCliLoginCommand.create({
      humanUserId: 'user_2AbC',
      firstName: 'Ada',
      email: 'ada@example.com',
      userCode: 'BCDF-GHJK',
      ...overrides,
    });
  }

  it('approves the login waiting for the code with the Development key of the backing organization', async () => {
    const { usecase, cliDeviceSessionService, getDecryptedSecretKey, approveCliDeviceSession, claimKeylessConnect } =
      setup();

    expect(await usecase.execute(command())).to.deep.equal({ ...account, keptSetup: false });
    expect(cliDeviceSessionService.holdForApprovalByUserCode.firstCall.args[0]).to.equal('BCDF-GHJK');
    expect(getDecryptedSecretKey.execute.firstCall.args[0]).to.deep.include({
      environmentId: 'dev_env',
      organizationId: 'novu_org',
    });
    expect(approveCliDeviceSession.execute.firstCall.args[0]).to.deep.include({
      deviceCode: 'device_code',
      userId: 'novu_user',
      organizationId: 'novu_org',
      environmentId: 'dev_env',
      apiKey: 'sk_test',
      userEmail: 'ada@example.com',
      userFirstName: 'Ada',
      userLastName: null,
    });
    expect(claimKeylessConnect.execute.called).to.equal(false);
    // Approved, so there's nothing to give back.
    expect(cliDeviceSessionService.releaseApprovalHold.called).to.equal(false);
  });

  it('touches nothing when no login is waiting for the code', async () => {
    const { usecase, cliDeviceSessionService, ensureBackingOrganization, claimKeylessConnect } = setup();
    cliDeviceSessionService.holdForApprovalByUserCode.resolves(null);

    const error = await usecase.execute(command({ claimToken: 'claim_token' })).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).to.deep.include({ code: CLI_LOGIN_NOT_FOUND_CODE });
    expect(ensureBackingOrganization.execute.called).to.equal(false);
    expect(claimKeylessConnect.execute.called).to.equal(false);
  });

  it('touches nothing while another approval is at work on the login', async () => {
    const { usecase, cliDeviceSessionService, ensureBackingOrganization, claimKeylessConnect } = setup();
    cliDeviceSessionService.holdForApprovalByUserCode.rejects(new CliDeviceSessionBeingApprovedError());

    const error = await usecase.execute(command({ claimToken: 'claim_token' })).catch((caught) => caught);

    expect(error).to.be.instanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).to.deep.include({ code: CLI_LOGIN_BEING_APPROVED_CODE });
    expect(ensureBackingOrganization.execute.called).to.equal(false);
    expect(claimKeylessConnect.execute.called).to.equal(false);
    // The hold is the other approval's to give back.
    expect(cliDeviceSessionService.releaseApprovalHold.called).to.equal(false);
  });

  it('moves the keyless setup into the account before letting the CLI in', async () => {
    const {
      usecase,
      cliDeviceSessionService,
      ensureBackingOrganization,
      claimKeylessConnect,
      approveCliDeviceSession,
    } = setup();

    expect(await usecase.execute(command({ claimToken: 'claim_token' }))).to.deep.include({ keptSetup: true });
    expect(claimKeylessConnect.execute.firstCall.args[0]).to.deep.include({
      token: 'claim_token',
      organizationId: 'novu_org',
      userId: 'novu_user',
    });
    expect(claimKeylessConnect.execute.calledBefore(approveCliDeviceSession.execute)).to.equal(true);
    // The login is held before anything is created or moved, so it can't be denied halfway.
    expect(cliDeviceSessionService.holdForApprovalByUserCode.calledBefore(ensureBackingOrganization.execute)).to.equal(
      true
    );
    // And the hold is checked once more right before the move, the one step that can't be taken back.
    expect(cliDeviceSessionService.renewApprovalHold.args).to.deep.equal([[hold]]);
    expect(cliDeviceSessionService.renewApprovalHold.calledAfter(ensureBackingOrganization.execute)).to.equal(true);
    expect(cliDeviceSessionService.renewApprovalHold.calledBefore(claimKeylessConnect.execute)).to.equal(true);
  });

  it('keeps the login held for as long as it is at work on it', async () => {
    const { usecase, cliDeviceSessionService, ensureBackingOrganization, approveCliDeviceSession } = setup();
    let renewing = false;
    const atWorkWhile: boolean[] = [];
    cliDeviceSessionService.whileRenewingApprovalHold = sinon.spy(
      async (_hold: unknown, work: () => Promise<unknown>) => {
        renewing = true;
        try {
          return await work();
        } finally {
          renewing = false;
        }
      }
    );
    ensureBackingOrganization.execute.callsFake(async () => {
      atWorkWhile.push(renewing);

      return account;
    });
    approveCliDeviceSession.execute.callsFake(async () => {
      atWorkWhile.push(renewing);

      return { ok: true };
    });

    await usecase.execute(command({ claimToken: 'claim_token' }));

    // From preparing the account to letting the CLI in, all of it runs with the hold being renewed.
    expect(cliDeviceSessionService.whileRenewingApprovalHold.firstCall.args[0]).to.equal(hold);
    expect(atWorkWhile).to.deep.equal([true, true]);
  });

  it('moves nothing when the login is no longer held for this approval', async () => {
    const { usecase, cliDeviceSessionService, claimKeylessConnect, approveCliDeviceSession } = setup();
    // The hold ran out while the account was prepared, and the login was denied or approved elsewhere since.
    cliDeviceSessionService.renewApprovalHold.resolves(false);

    const error = await usecase.execute(command({ claimToken: 'claim_token' })).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).to.deep.include({ code: CLI_LOGIN_NOT_FOUND_CODE });
    expect(claimKeylessConnect.execute.called).to.equal(false);
    expect(approveCliDeviceSession.execute.called).to.equal(false);
  });

  it('does not log in when the setup cannot be kept, and says why with a claim code', async () => {
    const { usecase, cliDeviceSessionService, claimKeylessConnect, approveCliDeviceSession } = setup();

    claimKeylessConnect.execute.rejects(
      new ConflictException({ message: 'Your account already has a setup.', code: 'claim_agent_exists' })
    );
    const exists = await usecase.execute(command({ claimToken: 'claim_token' })).catch((caught) => caught);
    expect(exists.getStatus()).to.equal(409);
    expect(exists.getResponse()).to.deep.include({ code: 'claim_agent_exists' });

    claimKeylessConnect.execute.rejects(new BadRequestException('This claim link has already been used.'));
    const used = await usecase.execute(command({ claimToken: 'claim_token' })).catch((caught) => caught);
    expect(used.getStatus()).to.equal(400);
    expect(used.getResponse()).to.deep.equal({
      message: 'This claim link has already been used.',
      code: CLAIM_FAILED_CODE,
    });

    expect(approveCliDeviceSession.execute.called).to.equal(false);
    // Each failed approval gave the login back, so it can be approved without the setup, or denied.
    expect(cliDeviceSessionService.releaseApprovalHold.args).to.deep.equal([[hold], [hold]]);
  });

  it('reports a login that ran out while it was being approved', async () => {
    const { usecase, approveCliDeviceSession } = setup();
    approveCliDeviceSession.execute.rejects(new NotFoundException('CLI device session not found or expired'));

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect((error as NotFoundException).getResponse()).to.deep.include({ code: CLI_LOGIN_NOT_FOUND_CODE });
  });

  it('reports why the approval failed, even when the login cannot be given back', async () => {
    const { usecase, cliDeviceSessionService, ensureBackingOrganization } = setup();
    ensureBackingOrganization.execute.rejects(new Error('Clerk is down'));
    cliDeviceSessionService.releaseApprovalHold.rejects(new Error('Redis is down'));

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect((error as Error).message).to.equal('Clerk is down');
  });
});
