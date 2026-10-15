import { ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { DeleteHumanAgentCommand } from './delete-human-agent.command';
import { DeleteHumanAgent } from './delete-human-agent.usecase';

describe('DeleteHumanAgent', () => {
  const scope = { _environmentId: 'env1', _organizationId: 'org1' };
  const relay = { _id: 'relay1', runtime: 'human_relay', picture: { storageKey: 'org1/env1/agents/relay1/p.png' } };

  function setup(
    options: {
      agent?: Record<string, unknown> | null;
      links?: string[];
      disconnectedLinks?: string[];
      usedByOtherAgents?: string[];
    } = {}
  ) {
    const steps: string[] = [];
    const record =
      (name: string, result: unknown = { acknowledged: true, deletedCount: 1 }) =>
      async () => {
        steps.push(name);

        return result;
      };

    const agentRepository = {
      findOne: sinon.stub().resolves(options.agent === undefined ? relay : options.agent),
      delete: sinon.stub().callsFake(record('agent')),
      withTransaction: sinon.stub().callsFake(async (fn: (session: unknown) => Promise<void>) => {
        steps.push('transaction');
        await fn('session');
      }),
    };
    const agentIntegrationRepository = {
      find: sinon.stub().callsFake(async (query: Record<string, unknown>) => {
        if (query._agentId && typeof query._agentId === 'object') {
          return (options.usedByOtherAgents ?? []).map((id) => ({ _integrationId: id }));
        }

        const ids = 'disconnectedAt' in query ? options.disconnectedLinks : options.links;

        return (ids ?? []).map((id) => ({ _integrationId: id }));
      }),
      delete: sinon.stub().callsFake(record('agentIntegration')),
    };
    const integrationRepository = {
      find: sinon
        .stub()
        .callsFake(async (query: { _id: { $in: string[] } }) =>
          query._id.$in.map((id) => ({ _id: id, identifier: `${id}-identifier` }))
        ),
      _model: { deleteMany: sinon.stub().callsFake(record('integration')) },
    };
    const conversationRepository = {
      find: sinon.stub().resolves([{ _id: 'conv1' }, { _id: 'conv2' }]),
      delete: sinon.stub().callsFake(record('conversation')),
    };
    const repositories = Object.fromEntries(
      ['channelConnection', 'channelEndpoint', 'conversationActivity', 'humanInteraction', 'humanContact'].map(
        (name) => [name, { delete: sinon.stub().callsFake(record(name)) }]
      )
    );
    const domainRouteRepository = { removeByDestination: sinon.stub().callsFake(record('domainRoute')) };
    const humanAgentPicture = { forget: sinon.stub().callsFake(record('picture')) };

    const usecase = new DeleteHumanAgent(
      agentRepository as never,
      agentIntegrationRepository as never,
      integrationRepository as never,
      repositories.channelConnection as never,
      repositories.channelEndpoint as never,
      conversationRepository as never,
      repositories.conversationActivity as never,
      repositories.humanInteraction as never,
      repositories.humanContact as never,
      domainRouteRepository as never,
      humanAgentPicture as never
    );

    return {
      usecase,
      steps,
      agentRepository,
      agentIntegrationRepository,
      integrationRepository,
      conversationRepository,
      repositories,
      domainRouteRepository,
      humanAgentPicture,
    };
  }

  const command = DeleteHumanAgentCommand.create({ environmentId: 'env1', organizationId: 'org1', userId: 'user1' });

  it('deletes the agent, its conversations, questions and what it kept about contacts in one transaction', async () => {
    const { usecase, steps, agentRepository, conversationRepository, repositories, humanAgentPicture } = setup();

    await usecase.execute(command);

    expect(agentRepository.findOne.firstCall.args[0]).to.deep.equal({ ...scope, identifier: 'human-relay' });
    expect(agentRepository.withTransaction.calledOnce).to.equal(true);
    expect(repositories.humanInteraction.delete.firstCall.args).to.deep.equal([
      { ...scope, _agentId: 'relay1' },
      { session: 'session' },
    ]);
    expect(repositories.conversationActivity.delete.firstCall.args[0]).to.deep.equal({
      ...scope,
      _conversationId: { $in: ['conv1', 'conv2'] },
    });
    expect(conversationRepository.delete.firstCall.args[0]).to.deep.equal({ ...scope, _agentId: 'relay1' });
    expect(agentRepository.delete.firstCall.args).to.deep.equal([{ ...scope, _id: 'relay1' }, { session: 'session' }]);
    expect(humanAgentPicture.forget.firstCall.args[0]).to.equal(relay);
    // The picture file goes only once the records are gone.
    expect(steps.indexOf('picture')).to.be.greaterThan(steps.indexOf('agent'));
  });

  it('keeps the operator’s own contact record, so they are still "you" for the next agent', async () => {
    const { usecase, repositories } = setup();

    await usecase.execute(command);

    expect(repositories.humanContact.delete.firstCall.args[0]).to.deep.equal({
      ...scope,
      _agentId: 'relay1',
      isOperator: { $ne: true },
    });
  });

  it('deletes the channels only this agent uses, with their chats and connections, and frees its address', async () => {
    const { usecase, integrationRepository, repositories, domainRouteRepository, agentIntegrationRepository } = setup({
      links: ['email1', 'telegram1', 'slack1'],
      disconnectedLinks: ['old-telegram'],
      usedByOtherAgents: ['slack1'],
    });

    await usecase.execute(command);

    const ownIds = ['email1', 'telegram1', 'old-telegram'];
    expect(integrationRepository._model.deleteMany.firstCall.args).to.deep.equal([
      { ...scope, _id: { $in: ownIds }, channel: { $ne: ChannelTypeEnum.IN_APP } },
      { session: 'session' },
    ]);
    expect(repositories.channelEndpoint.delete.firstCall.args[0]).to.deep.equal({
      ...scope,
      integrationIdentifier: { $in: ownIds.map((id) => `${id}-identifier`) },
    });
    expect(repositories.channelConnection.delete.firstCall.args[0]).to.deep.equal({
      ...scope,
      integrationIdentifier: { $in: ownIds.map((id) => `${id}-identifier`) },
    });
    expect(domainRouteRepository.removeByDestination.firstCall.args.slice(0, 3)).to.deep.equal([
      'env1',
      'org1',
      'relay1',
    ]);
    // Every link of the agent goes, the one to a shared channel too.
    expect(agentIntegrationRepository.delete.firstCall.args[0]).to.deep.equal({ ...scope, _agentId: 'relay1' });
  });

  it('touches no channel when the agent has none', async () => {
    const { usecase, integrationRepository, repositories } = setup({ links: [] });

    await usecase.execute(command);

    expect(integrationRepository._model.deleteMany.called).to.equal(false);
    expect(repositories.channelEndpoint.delete.called).to.equal(false);
  });

  it('answers 404 when there is no agent, and deletes nothing', async () => {
    const { usecase, agentRepository } = setup({ agent: null });

    const error = await usecase.execute(command).catch((caught: Error) => caught);

    expect((error as { status?: number }).status).to.equal(404);
    expect(agentRepository.withTransaction.called).to.equal(false);
  });

  it('never deletes an agent that is not a relay', async () => {
    const { usecase, agentRepository } = setup({ agent: { _id: 'bot', runtime: 'managed' } });

    const error = await usecase.execute(command).catch((caught: Error) => caught);

    expect((error as { status?: number }).status).to.equal(404);
    expect(agentRepository.withTransaction.called).to.equal(false);
  });
});
