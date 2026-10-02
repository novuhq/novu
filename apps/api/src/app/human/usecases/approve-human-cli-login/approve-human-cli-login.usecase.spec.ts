import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { ApproveHumanCliLoginCommand } from './approve-human-cli-login.command';
import { ApproveHumanCliLogin, CLAIM_FAILED_CODE, CLI_LOGIN_NOT_FOUND_CODE } from './approve-human-cli-login.usecase';

describe('ApproveHumanCliLogin', () => {
  const account = { organizationId: 'novu_org', userId: 'novu_user', environmentId: 'dev_env', region: 'us' };

  function setup() {
    const cliDeviceSessionService = { findPendingByUserCode: sinon.stub().resolves('device_code') };
    const ensureBackingOrganization = { execute: sinon.stub().resolves(account) };
    const claimKeylessConnect = { execute: sinon.stub().resolves({ environmentId: 'dev_env' }) };
    const getDecryptedSecretKey = { execute: sinon.stub().resolves('sk_test') };
    const approveCliDeviceSession = { execute: sinon.stub().resolves({ ok: true }) };

    const usecase = new ApproveHumanCliLogin(
      cliDeviceSessionService as never,
      ensureBackingOrganization as never,
      claimKeylessConnect as never,
      getDecryptedSecretKey as never,
      approveCliDeviceSession as never
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
    expect(cliDeviceSessionService.findPendingByUserCode.firstCall.args[0]).to.equal('BCDF-GHJK');
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
  });

  it('touches nothing when no login is waiting for the code', async () => {
    const { usecase, cliDeviceSessionService, ensureBackingOrganization, claimKeylessConnect } = setup();
    cliDeviceSessionService.findPendingByUserCode.resolves(null);

    const error = await usecase.execute(command({ claimToken: 'claim_token' })).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).to.deep.include({ code: CLI_LOGIN_NOT_FOUND_CODE });
    expect(ensureBackingOrganization.execute.called).to.equal(false);
    expect(claimKeylessConnect.execute.called).to.equal(false);
  });

  it('moves the keyless setup into the account before letting the CLI in', async () => {
    const { usecase, claimKeylessConnect, approveCliDeviceSession } = setup();

    expect(await usecase.execute(command({ claimToken: 'claim_token' }))).to.deep.include({ keptSetup: true });
    expect(claimKeylessConnect.execute.firstCall.args[0]).to.deep.include({
      token: 'claim_token',
      organizationId: 'novu_org',
      userId: 'novu_user',
    });
    expect(claimKeylessConnect.execute.calledBefore(approveCliDeviceSession.execute)).to.equal(true);
  });

  it('does not log in when the setup cannot be kept, and says why with a claim code', async () => {
    const { usecase, claimKeylessConnect, approveCliDeviceSession } = setup();

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
  });

  it('reports a login that ran out while it was being approved', async () => {
    const { usecase, approveCliDeviceSession } = setup();
    approveCliDeviceSession.execute.rejects(new NotFoundException('CLI device session not found or expired'));

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect((error as NotFoundException).getResponse()).to.deep.include({ code: CLI_LOGIN_NOT_FOUND_CODE });
  });
});
