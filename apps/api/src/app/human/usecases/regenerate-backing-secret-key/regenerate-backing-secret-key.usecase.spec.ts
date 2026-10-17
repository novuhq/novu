import { NotFoundException } from '@nestjs/common';
import { EnvironmentTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { RegenerateBackingSecretKeyCommand } from './regenerate-backing-secret-key.command';
import { RegenerateBackingSecretKey } from './regenerate-backing-secret-key.usecase';

describe('RegenerateBackingSecretKey', () => {
  function setup(
    account: { clerkUserId: string; clerkOrganizationId?: string } | null,
    apiKeys: { _userId: string }[] = [{ _userId: 'novu_user' }]
  ) {
    const humanBackingAccounts = { find: sinon.stub().resolves(account) };
    const communityOrganizationRepository = { findOne: sinon.stub().resolves({ _id: 'novu_org' }) };
    const environmentRepository = {
      findOrganizationEnvironments: sinon.stub().resolves([
        { _id: 'prod_env', type: EnvironmentTypeEnum.PROD, apiKeys: [{ _userId: 'novu_user' }] },
        { _id: 'dev_env', type: EnvironmentTypeEnum.DEV, apiKeys },
      ]),
    };
    const regenerateApiKeys = { execute: sinon.stub().resolves([{ _userId: 'novu_user', key: 'sk_new' }]) };

    const usecase = new RegenerateBackingSecretKey(
      humanBackingAccounts as never,
      communityOrganizationRepository as never,
      environmentRepository as never,
      regenerateApiKeys as never
    );

    return { usecase, communityOrganizationRepository, regenerateApiKeys };
  }

  const command = RegenerateBackingSecretKeyCommand.create({ humanUserId: 'user_2AbC' });

  it('replaces the Development environment key of the backing organization and returns the new one', async () => {
    const { usecase, communityOrganizationRepository, regenerateApiKeys } = setup({
      clerkUserId: 'clerk_user',
      clerkOrganizationId: 'clerk_org',
    });

    expect(await usecase.execute(command)).to.deep.equal({ environmentId: 'dev_env', secretKey: 'sk_new' });
    expect(communityOrganizationRepository.findOne.firstCall.args[0]).to.deep.equal({ externalId: 'clerk_org' });
    expect(regenerateApiKeys.execute.calledOnce).to.equal(true);
    expect(regenerateApiKeys.execute.firstCall.args[0]).to.deep.include({
      environmentId: 'dev_env',
      organizationId: 'novu_org',
      userId: 'novu_user',
    });
  });

  it('is not found, and replaces nothing, when the account has no backing organization yet', async () => {
    for (const account of [null, { clerkUserId: 'clerk_user' }]) {
      const { usecase, regenerateApiKeys } = setup(account);

      const error = await usecase.execute(command).catch((caught) => caught);

      expect(error).to.be.instanceOf(NotFoundException);
      expect(regenerateApiKeys.execute.called).to.equal(false);
    }
  });

  it('is not found when the Development environment has no key to replace', async () => {
    const { usecase, regenerateApiKeys } = setup({ clerkUserId: 'clerk_user', clerkOrganizationId: 'clerk_org' }, []);

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect(regenerateApiKeys.execute.called).to.equal(false);
  });
});
