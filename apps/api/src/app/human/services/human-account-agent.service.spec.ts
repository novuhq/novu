import { ConflictException } from '@nestjs/common';
import { AGENT_INBOX_EVENTS } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanAccountAgentService } from './human-account-agent.service';

describe('HumanAccountAgentService', () => {
  const account = { environmentId: 'env1', organizationId: 'org1', userId: 'user1' };
  const name = { firstName: 'Dima' };

  function setup({
    relays = [{ _id: 'relay1', identifier: 'human-relay' }] as readonly object[],
    channels = 0,
    interactions = 0,
    otherContacts = 0,
    operatorEmail = undefined as string | undefined,
    defaultVia = undefined as string | undefined,
  } = {}) {
    const agentRepository = {
      find: sinon.stub().resolves(relays),
      findOne: sinon.stub().resolves({ _id: 'claimed1', runtime: 'human_relay' }),
      delete: sinon.stub().resolves(),
    };
    const agentIntegrationRepository = { count: sinon.stub().resolves(channels) };
    const humanInteractionRepository = { count: sinon.stub().resolves(interactions) };
    const humanContactRepository = {
      delete: sinon.stub().resolves(),
      findContact: sinon.stub().resolves(defaultVia ? { defaultVia } : null),
    };
    const subscriberRepository = {
      count: sinon.stub().resolves(otherContacts),
      findOne: sinon.stub().resolves({ email: operatorEmail }),
      delete: sinon.stub().resolves(),
    };
    const humanOperator = { findForAgent: sinon.stub().resolves('human_aaaaaaaaaaaa') };
    const setupHumanRelay = { execute: sinon.stub().resolves() };
    const deliveryService = {
      listInviteChannels: sinon.stub().resolves([
        { via: 'telegram', integrationIdentifier: 'tg' },
        { via: 'email', integrationIdentifier: 'inbox' },
      ]),
    };
    const analyticsService = { track: sinon.stub() };
    const service = new HumanAccountAgentService(
      agentRepository as never,
      agentIntegrationRepository as never,
      humanInteractionRepository as never,
      humanContactRepository as never,
      subscriberRepository as never,
      humanOperator as never,
      setupHumanRelay as never,
      deliveryService as never,
      analyticsService as never
    );

    return {
      service,
      agentRepository,
      humanContactRepository,
      subscriberRepository,
      setupHumanRelay,
      deliveryService,
      analyticsService,
    };
  }

  /** Lets the count that runs in the background finish. */
  const settle = () => new Promise((resolve) => setImmediate(resolve));

  it('sets the agent up for the operator', async () => {
    const { service, setupHumanRelay } = setup();

    await service.setUp(account, name);

    expect(setupHumanRelay.execute.firstCall.args[0]).to.include({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      operator: true,
      firstName: 'Dima',
    });
  });

  it('removes an untouched agent and its operator before the claim runs', async () => {
    const { service, agentRepository, humanContactRepository, subscriberRepository, setupHumanRelay } = setup();
    const claim = sinon.stub().resolves('claimed');

    const result = await service.claimOverUntouchedAgent(account, name, claim);

    expect(result).to.equal('claimed');
    expect(agentRepository.delete.calledBefore(claim)).to.equal(true);
    expect(agentRepository.delete.firstCall.args[0]).to.include({ _id: 'relay1', _environmentId: 'env1' });
    expect(humanContactRepository.delete.firstCall.args[0]).to.include({ _agentId: 'relay1' });
    expect(subscriberRepository.delete.firstCall.args[0]).to.include({ subscriberId: 'human_aaaaaaaaaaaa' });
    expect(setupHumanRelay.execute.called).to.equal(false);
  });

  for (const [what, used] of [
    ['a channel', { channels: 1 }],
    ['an interaction', { interactions: 1 }],
    ['another contact', { otherContacts: 1 }],
    ['an operator who saved their email', { operatorEmail: 'dima@example.com' }],
    ['an operator who chose a default channel', { defaultVia: 'telegram' }],
    [
      'a second relay agent beside it',
      {
        relays: [
          { _id: 'relay1', identifier: 'human-relay' },
          { _id: 'relay2', identifier: 'second-relay' },
        ],
      },
    ],
  ] as const) {
    it(`leaves an agent with ${what} alone`, async () => {
      const { service, agentRepository } = setup(used);
      const claim = sinon.stub().rejects(new ConflictException({ code: 'claim_agent_exists' }));

      const error = await service.claimOverUntouchedAgent(account, name, claim).catch((err) => err);

      expect(error).to.be.instanceOf(ConflictException);
      expect(agentRepository.delete.called).to.equal(false);
    });
  }

  it('has nothing to remove for an account without an agent', async () => {
    const { service, agentRepository } = setup({ relays: [] });

    await service.claimOverUntouchedAgent(account, name, sinon.stub().resolves());

    expect(agentRepository.delete.called).to.equal(false);
  });

  it("counts the claimed setup's inbox and channels for the account, as made in the CLI", async () => {
    const { service, agentRepository, deliveryService, analyticsService } = setup({ relays: [] });

    await service.claimOverUntouchedAgent(
      account,
      name,
      sinon.stub().resolves({ environmentId: 'env1', agentIdentifier: 'human-relay' })
    );
    await settle();

    expect(agentRepository.findOne.firstCall.args[0]).to.deep.equal({
      _environmentId: 'env1',
      _organizationId: 'org1',
      identifier: 'human-relay',
    });
    expect(deliveryService.listInviteChannels.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'claimed1',
    });
    expect(analyticsService.track.args).to.deep.equal([
      [AGENT_INBOX_EVENTS.INBOX_CREATED, 'user1', { _organization: 'org1', agentId: 'claimed1', source: 'cli' }],
      [
        AGENT_INBOX_EVENTS.CHANNEL_CONNECTED,
        'user1',
        { _organization: 'org1', agentId: 'claimed1', channel: 'telegram' },
      ],
      [AGENT_INBOX_EVENTS.CHANNEL_CONNECTED, 'user1', { _organization: 'org1', agentId: 'claimed1', channel: 'email' }],
    ]);
  });

  it('counts nothing for a claim that brought no agent', async () => {
    const { service, analyticsService } = setup({ relays: [] });

    await service.claimOverUntouchedAgent(account, name, sinon.stub().resolves({ environmentId: 'env1' }));
    await settle();

    expect(analyticsService.track.called).to.equal(false);
  });

  it('still claims when the setup cannot be counted', async () => {
    const { service, agentRepository } = setup({ relays: [] });
    agentRepository.findOne.rejects(new Error('database down'));
    const claimed = { environmentId: 'env1', agentIdentifier: 'human-relay' };

    const result = await service.claimOverUntouchedAgent(account, name, sinon.stub().resolves(claimed));
    await settle();

    expect(result).to.equal(claimed);
  });

  it('gives the account its agent back when the claim fails', async () => {
    const { service, setupHumanRelay } = setup();
    const failure = new Error('token expired');

    const error = await service
      .claimOverUntouchedAgent(account, name, sinon.stub().rejects(failure))
      .catch((err) => err);

    expect(error).to.equal(failure);
    expect(setupHumanRelay.execute.calledOnce).to.equal(true);
    expect(setupHumanRelay.execute.firstCall.args[0]).to.include({
      operator: true,
      firstName: 'Dima',
      subscriberId: 'human_aaaaaaaaaaaa',
    });
  });

  it('gives the account its agent back when removing it fails halfway, without running the claim', async () => {
    const { service, subscriberRepository, setupHumanRelay } = setup();
    const failure = new Error('database down');
    subscriberRepository.delete.rejects(failure);
    const claim = sinon.stub().resolves();

    const error = await service.claimOverUntouchedAgent(account, name, claim).catch((err) => err);

    expect(error).to.equal(failure);
    expect(claim.called).to.equal(false);
    expect(setupHumanRelay.execute.calledOnce).to.equal(true);
  });
});
