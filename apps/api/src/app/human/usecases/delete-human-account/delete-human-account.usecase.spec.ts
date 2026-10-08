import { InMemoryLRUCacheStore } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { DeleteHumanAccountCommand } from './delete-human-account.command';
import { DeleteHumanAccount } from './delete-human-account.usecase';

describe('DeleteHumanAccount', () => {
  function model(scopedByOrganization: boolean) {
    return {
      schema: { path: (name: string) => (scopedByOrganization && name === '_organizationId' ? {} : undefined) },
      deleteMany: sinon.stub().resolves({ deletedCount: 1 }),
    };
  }

  function setup(account: { clerkUserId: string; clerkOrganizationId?: string } | null = null) {
    const steps: string[] = [];
    const models = { Agent: model(true), Subscriber: model(true), Organization: model(false), User: model(false) };

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
      _model: { db: { models } },
    };
    const agentRepository = {
      find: sinon.stub().resolves([{ _id: 'relay_agent', _environmentId: 'dev_env' }]),
      withTransaction: sinon.stub().callsFake(async (fn: (session: unknown) => Promise<void>) => {
        steps.push('transaction');
        await fn('session');
      }),
    };
    const subscriberRepository = {
      find: sinon.stub().resolves([
        { subscriberId: 'maya', _environmentId: 'dev_env' },
        { subscriberId: 'someone-in-prod', _environmentId: 'prod_env' },
      ]),
    };
    const inviteTokens = {
      revokeAll: sinon.stub().callsFake(async () => {
        steps.push('revoke');
      }),
    };
    const invalidateCache = { invalidateByKey: sinon.stub().resolves(), invalidateQuery: sinon.stub().resolves() };
    const inMemoryLRUCacheService = { invalidate: sinon.stub() };

    const usecase = new DeleteHumanAccount(
      humanBackingAccounts as never,
      communityOrganizationRepository as never,
      environmentRepository as never,
      agentRepository as never,
      subscriberRepository as never,
      inviteTokens as never,
      invalidateCache as never,
      inMemoryLRUCacheService as never
    );

    return {
      usecase,
      steps,
      models,
      humanBackingAccounts,
      communityOrganizationRepository,
      agentRepository,
      inviteTokens,
      invalidateCache,
      inMemoryLRUCacheService,
    };
  }

  const command = DeleteHumanAccountCommand.create({ humanUserId: 'user_2AbC' });
  const existing = { clerkUserId: 'clerk_user', clerkOrganizationId: 'clerk_org' };

  it('deletes everything under the organization in one transaction, and nothing else', async () => {
    const { usecase, models, agentRepository, communityOrganizationRepository } = setup(existing);

    await usecase.execute(command);

    expect(communityOrganizationRepository.findOne.firstCall.args[0]).to.deep.equal({ externalId: 'clerk_org' });
    expect(agentRepository.withTransaction.calledOnce).to.equal(true);
    for (const scoped of [models.Agent, models.Subscriber]) {
      expect(scoped.deleteMany.calledOnceWithExactly({ _organizationId: 'novu_org' }, { session: 'session' })).to.equal(
        true
      );
    }
    // Collections that aren't scoped to an organization hold other accounts' documents too.
    expect(models.Organization.deleteMany.called).to.equal(false);
    expect(models.User.deleteMany.called).to.equal(false);
  });

  it('retires the invite links first, then deletes the data, then the organization itself', async () => {
    const { usecase, steps, inviteTokens } = setup(existing);

    await usecase.execute(command);

    expect(steps).to.deep.equal(['revoke', 'transaction', 'shell']);
    // Only contacts of the relay agent's own environment have links.
    expect(
      inviteTokens.revokeAll.calledOnceWithExactly({ env: 'dev_env', agentId: 'relay_agent', subscriberId: 'maya' })
    ).to.equal(true);
  });

  it('forgets the cached API keys and contacts once the data is gone', async () => {
    const { usecase, inMemoryLRUCacheService, invalidateCache } = setup(existing);

    await usecase.execute(command);

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
