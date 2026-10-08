import { InMemoryLRUCacheStore } from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { DeleteHumanAccountCommand } from './delete-human-account.command';
import { DeleteHumanAccount } from './delete-human-account.usecase';

describe('DeleteHumanAccount', () => {
  /** The collections that hold Human's data, in the order the use case takes its repositories. */
  const HUMAN_COLLECTIONS = [
    'agentIntegration',
    'channelConnection',
    'channelEndpoint',
    'conversation',
    'conversationActivity',
    'agentMcpServer',
    'mcpConnection',
    'humanInteraction',
    'humanContact',
  ] as const;

  function setup(account: { clerkUserId: string; clerkOrganizationId?: string } | null = null) {
    const steps: string[] = [];

    const humanBackingAccounts = {
      find: sinon.stub().resolves(account),
      delete: sinon.stub().callsFake(async () => {
        steps.push('shell');

        return true;
      }),
    };
    const communityOrganizationRepository = { findOne: sinon.stub().resolves({ _id: 'novu_org' }) };
    const environmentRepository = {
      findOrganizationEnvironments: sinon.stub().resolves([
        { _id: 'dev_env', apiKeys: [{ hash: 'dev_hash' }] },
        { _id: 'prod_env', apiKeys: [{ hash: 'prod_hash' }, {}] },
      ]),
      delete: sinon.stub().resolves(),
    };
    const agentRepository = {
      find: sinon.stub().resolves([{ _id: 'relay_agent', _environmentId: 'dev_env' }]),
      delete: sinon.stub().resolves(),
      withTransaction: sinon.stub().callsFake(async (fn: (session: unknown) => Promise<void>) => {
        steps.push('transaction');
        await fn('session');
      }),
    };
    const integrationRepository = { _model: { deleteMany: sinon.stub().resolves() }, delete: sinon.stub().resolves() };
    const subscriberRepository = {
      find: sinon.stub().resolves([
        { subscriberId: 'maya', _environmentId: 'dev_env' },
        { subscriberId: 'someone-in-prod', _environmentId: 'prod_env' },
      ]),
      delete: sinon.stub().resolves(),
    };
    const others = Object.fromEntries(HUMAN_COLLECTIONS.map((name) => [name, { delete: sinon.stub().resolves() }]));
    const inviteTokens = {
      revokeAll: sinon.stub().callsFake(async () => {
        steps.push('revoke');
      }),
    };
    const invalidateCache = { invalidateByKey: sinon.stub().resolves(), invalidateQuery: sinon.stub().resolves() };
    const inMemoryLRUCacheService = {
      invalidate: sinon.stub().callsFake(() => {
        steps.push('forget-key');
      }),
    };

    const usecase = new DeleteHumanAccount(
      humanBackingAccounts as never,
      communityOrganizationRepository as never,
      environmentRepository as never,
      agentRepository as never,
      others.agentIntegration as never,
      integrationRepository as never,
      others.channelConnection as never,
      others.channelEndpoint as never,
      others.conversation as never,
      others.conversationActivity as never,
      others.agentMcpServer as never,
      others.mcpConnection as never,
      others.humanInteraction as never,
      others.humanContact as never,
      subscriberRepository as never,
      inviteTokens as never,
      invalidateCache as never,
      inMemoryLRUCacheService as never
    );

    return {
      usecase,
      steps,
      others,
      humanBackingAccounts,
      communityOrganizationRepository,
      environmentRepository,
      agentRepository,
      integrationRepository,
      subscriberRepository,
      inviteTokens,
      invalidateCache,
      inMemoryLRUCacheService,
    };
  }

  const command = DeleteHumanAccountCommand.create({ humanUserId: 'user_2AbC' });
  const existing = { clerkUserId: 'clerk_user', clerkOrganizationId: 'clerk_org' };
  const scope = { _organizationId: 'novu_org' };

  it("deletes Human's data of the organization in one transaction", async () => {
    const { usecase, others, agentRepository, subscriberRepository, communityOrganizationRepository } = setup(existing);

    await usecase.execute(command);

    expect(communityOrganizationRepository.findOne.firstCall.args[0]).to.deep.equal({ externalId: 'clerk_org' });
    expect(agentRepository.withTransaction.calledOnce).to.equal(true);
    for (const repository of [...Object.values(others), agentRepository, subscriberRepository]) {
      expect(repository.delete.calledOnceWithExactly(scope, { session: 'session' })).to.equal(true);
    }
  });

  it('removes the channels with their credentials for real, and leaves the in-app integration', async () => {
    const { usecase, integrationRepository } = setup(existing);

    await usecase.execute(command);

    // The repository's own delete only marks an integration as deleted, and its secrets stay.
    expect(integrationRepository.delete.called).to.equal(false);
    expect(
      integrationRepository._model.deleteMany.calledOnceWithExactly(
        { ...scope, channel: { $ne: ChannelTypeEnum.IN_APP } },
        { session: 'session' }
      )
    ).to.equal(true);
  });

  it('leaves what Novu sets up for every organization', async () => {
    const { usecase, environmentRepository } = setup(existing);

    await usecase.execute(command);

    expect(environmentRepository.delete.called).to.equal(false);
  });

  it('retires the invite links, deletes the data, then the organization, then forgets its API keys', async () => {
    const { usecase, steps, inviteTokens, inMemoryLRUCacheService, invalidateCache } = setup(existing);

    await usecase.execute(command);

    expect(steps).to.deep.equal(['revoke', 'transaction', 'shell', 'forget-key', 'forget-key']);
    // Only contacts of the relay agent's own environment have links.
    expect(
      inviteTokens.revokeAll.calledOnceWithExactly({ env: 'dev_env', agentId: 'relay_agent', subscriberId: 'maya' })
    ).to.equal(true);
    expect(inMemoryLRUCacheService.invalidate.args).to.deep.equal([
      [InMemoryLRUCacheStore.API_KEY_USER, 'dev_hash'],
      [InMemoryLRUCacheStore.API_KEY_USER, 'prod_hash'],
    ]);
    expect(invalidateCache.invalidateByKey.callCount).to.equal(2);
    expect(invalidateCache.invalidateQuery.callCount).to.equal(2);
  });

  it('keeps the organization when its data could not be deleted, so deleting again starts over', async () => {
    const { usecase, agentRepository, humanBackingAccounts } = setup(existing);
    agentRepository.withTransaction.rejects(new Error('write conflict'));

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error.message).to.equal('write conflict');
    expect(humanBackingAccounts.delete.called).to.equal(false);
  });

  it('only removes what is left of the account when there is no organization to empty', async () => {
    for (const account of [null, { clerkUserId: 'clerk_user' }]) {
      const { usecase, agentRepository, humanBackingAccounts, inviteTokens } = setup(account);

      await usecase.execute(command);

      expect(agentRepository.withTransaction.called).to.equal(false);
      expect(inviteTokens.revokeAll.called).to.equal(false);
      expect(humanBackingAccounts.delete.calledOnceWithExactly('user_2AbC')).to.equal(true);
    }
  });
});
