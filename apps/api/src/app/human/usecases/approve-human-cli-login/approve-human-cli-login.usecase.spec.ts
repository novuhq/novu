import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { ApproveHumanCliLoginCommand } from './approve-human-cli-login.command';
import { ApproveHumanCliLogin } from './approve-human-cli-login.usecase';

describe('ApproveHumanCliLogin', () => {
  function setup() {
    const ensureBackingOrganization = {
      execute: sinon
        .stub()
        .resolves({ organizationId: 'novu_org', userId: 'novu_user', environmentId: 'dev_env', region: 'us' }),
    };
    const getDecryptedSecretKey = { execute: sinon.stub().resolves('sk_test') };
    const approveCliDeviceSession = { execute: sinon.stub().resolves({ ok: true }) };

    const usecase = new ApproveHumanCliLogin(
      ensureBackingOrganization as never,
      getDecryptedSecretKey as never,
      approveCliDeviceSession as never
    );

    return { usecase, ensureBackingOrganization, getDecryptedSecretKey, approveCliDeviceSession };
  }

  const command = ApproveHumanCliLoginCommand.create({
    humanUserId: 'user_2AbC',
    firstName: 'Ada',
    email: 'ada@example.com',
    deviceCode: 'device-code_0123456789',
  });

  it('approves the login with the Development key of the backing organization', async () => {
    const { usecase, ensureBackingOrganization, getDecryptedSecretKey, approveCliDeviceSession } = setup();

    expect(await usecase.execute(command)).to.deep.equal({ environmentId: 'dev_env' });
    expect(ensureBackingOrganization.execute.firstCall.args[0]).to.deep.include({
      humanUserId: 'user_2AbC',
      firstName: 'Ada',
    });
    expect(getDecryptedSecretKey.execute.firstCall.args[0]).to.deep.include({
      environmentId: 'dev_env',
      organizationId: 'novu_org',
    });
    expect(approveCliDeviceSession.execute.firstCall.args[0]).to.deep.include({
      deviceCode: 'device-code_0123456789',
      userId: 'novu_user',
      organizationId: 'novu_org',
      environmentId: 'dev_env',
      apiKey: 'sk_test',
      userEmail: 'ada@example.com',
      userFirstName: 'Ada',
      userLastName: null,
    });
  });

  it('passes on that the login request expired or was already approved', async () => {
    const { usecase, approveCliDeviceSession } = setup();
    approveCliDeviceSession.execute.rejects(new NotFoundException('CLI device session not found or expired'));

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
  });
});
