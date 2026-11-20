import { NotFoundException } from '@nestjs/common';
import { EnvironmentTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetBackingSecretKeyCommand } from './get-backing-secret-key.command';
import { GetBackingSecretKey } from './get-backing-secret-key.usecase';

describe('GetBackingSecretKey', () => {
  function setup(account: { clerkUserId: string; clerkOrganizationId?: string } | null) {
    const humanBackingAccounts = { find: sinon.stub().resolves(account) };
    const communityOrganizationRepository = { findOne: sinon.stub().resolves({ _id: 'novu_org' }) };
    const environmentRepository = {
      findOrganizationEnvironments: sinon.stub().resolves([{ _id: 'dev_env', type: EnvironmentTypeEnum.DEV }]),
    };
    const getDecryptedSecretKey = { execute: sinon.stub().resolves('sk_test') };

    const usecase = new GetBackingSecretKey(
      humanBackingAccounts as never,
      communityOrganizationRepository as never,
      environmentRepository as never,
      getDecryptedSecretKey as never
    );

    return { usecase, communityOrganizationRepository, getDecryptedSecretKey };
  }

  const command = GetBackingSecretKeyCommand.create({ humanUserId: 'user_2AbC' });

  it('returns the Development environment key of the backing organization', async () => {
    const { usecase, communityOrganizationRepository, getDecryptedSecretKey } = setup({
      clerkUserId: 'clerk_user',
      clerkOrganizationId: 'clerk_org',
    });

    expect(await usecase.execute(command)).to.deep.equal({ environmentId: 'dev_env', secretKey: 'sk_test' });
    expect(communityOrganizationRepository.findOne.firstCall.args[0]).to.deep.equal({ externalId: 'clerk_org' });
    expect(getDecryptedSecretKey.execute.firstCall.args[0]).to.deep.include({
      environmentId: 'dev_env',
      organizationId: 'novu_org',
    });
  });

  it('is not found when the account has no backing organization yet', async () => {
    for (const account of [null, { clerkUserId: 'clerk_user' }]) {
      const { usecase, getDecryptedSecretKey } = setup(account);

      const error = await usecase.execute(command).catch((caught) => caught);

      expect(error).to.be.instanceOf(NotFoundException);
      expect(getDecryptedSecretKey.execute.called).to.equal(false);
    }
  });
});
