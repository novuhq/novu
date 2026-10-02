import { ConflictException } from '@nestjs/common';
import { EnvironmentTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { EnsureBackingOrganizationCommand } from './ensure-backing-organization.command';
import { EnsureBackingOrganization } from './ensure-backing-organization.usecase';

describe('EnsureBackingOrganization', () => {
  const originalRegion = process.env.NOVU_REGION;

  afterEach(() => {
    if (originalRegion === undefined) {
      delete process.env.NOVU_REGION;
    } else {
      process.env.NOVU_REGION = originalRegion;
    }
  });

  function setup({ organizationExists }: { organizationExists: boolean }) {
    const humanBackingAccounts = {
      findOrCreate: sinon
        .stub()
        .resolves({ clerkUserId: 'clerk_user', clerkOrganizationId: 'clerk_org', novuUserId: 'novu_user' }),
    };
    const communityOrganizationRepository = {
      findOne: sinon.stub().resolves(organizationExists ? { _id: 'novu_org' } : null),
    };
    const environmentRepository = {
      findOrganizationEnvironments: sinon.stub().resolves([
        { _id: 'prod_env', type: EnvironmentTypeEnum.PROD, _parentId: 'dev_env' },
        { _id: 'dev_env', type: EnvironmentTypeEnum.DEV },
      ]),
    };
    const cacheService = {
      cacheEnabled: sinon.stub().returns(true),
      setIfNotExist: sinon.stub().resolves('OK'),
      del: sinon.stub().resolves(),
    };
    const syncExternalOrganization = { execute: sinon.stub().resolves({ _id: 'novu_org' }) };
    const moduleRef = { resolve: sinon.stub().resolves(syncExternalOrganization) };

    const usecase = new EnsureBackingOrganization(
      humanBackingAccounts as never,
      communityOrganizationRepository as never,
      environmentRepository as never,
      cacheService as never,
      moduleRef as never
    );

    return { usecase, humanBackingAccounts, syncExternalOrganization, cacheService };
  }

  const command = EnsureBackingOrganizationCommand.create({
    humanUserId: 'user_2AbC',
    firstName: 'Ada',
    lastName: 'Lovelace',
  });

  it('runs the normal organization setup the first time', async () => {
    process.env.NOVU_REGION = 'us-east-1';
    const { usecase, humanBackingAccounts, syncExternalOrganization } = setup({ organizationExists: false });

    const result = await usecase.execute(command);

    expect(humanBackingAccounts.findOrCreate.firstCall.args[0]).to.deep.equal({
      humanUserId: 'user_2AbC',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(syncExternalOrganization.execute.firstCall.args[0]).to.deep.include({
      userId: 'novu_user',
      externalId: 'clerk_org',
      email: 'user_2abc@users.gethuman.md',
    });
    expect(result).to.deep.equal({
      organizationId: 'novu_org',
      userId: 'novu_user',
      environmentId: 'dev_env',
      region: 'us',
    });
  });

  it('reuses the organization on later visits', async () => {
    process.env.NOVU_REGION = 'eu-central-1';
    const { usecase, syncExternalOrganization, cacheService } = setup({ organizationExists: true });

    const result = await usecase.execute(command);

    expect(syncExternalOrganization.execute.called).to.equal(false);
    expect(result).to.include({ organizationId: 'novu_org', environmentId: 'dev_env', region: 'eu' });
    expect(cacheService.del.calledOnceWith('human_backing_account_lock:{user_2AbC}')).to.equal(true);
  });

  it('refuses while another request is setting the same account up', async () => {
    const { usecase, cacheService, humanBackingAccounts } = setup({ organizationExists: false });
    cacheService.setIfNotExist.resolves(null);

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error).to.be.instanceOf(ConflictException);
    expect(humanBackingAccounts.findOrCreate.called).to.equal(false);
    expect(cacheService.del.called).to.equal(false);
  });

  it('releases the lock when the setup fails', async () => {
    const { usecase, cacheService, humanBackingAccounts } = setup({ organizationExists: false });
    humanBackingAccounts.findOrCreate.rejects(new Error('Clerk is down'));

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error.message).to.equal('Clerk is down');
    expect(cacheService.del.calledOnce).to.equal(true);
  });
});
