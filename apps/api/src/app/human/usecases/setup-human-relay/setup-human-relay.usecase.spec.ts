import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SetupHumanRelayCommand } from './setup-human-relay.command';
import { SetupHumanRelay } from './setup-human-relay.usecase';

describe('SetupHumanRelay', () => {
  function setup(
    existingAgent: Record<string, unknown> | null = {
      _id: 'relay1',
      identifier: 'human-relay',
      runtime: 'human_relay',
      name: 'Human',
    }
  ) {
    const agentRepository = {
      findOne: sinon.stub().resolves(existingAgent),
      update: sinon.stub().resolves(),
      create: sinon.stub().callsFake(async (data: Record<string, unknown>) => ({ _id: 'relay-new', ...data })),
    };
    const subscriberRepository: Record<string, sinon.SinonStub> = {
      findOne: sinon.stub().resolves({ subscriberId: 'alice' }),
      update: sinon.stub(),
    };
    const humanContactRepository = {
      setDefaultVia: sinon.stub().resolves(),
      setDeclaredAddress: sinon
        .stub()
        .resolves({ address: 'alice@example.com', declaredAt: '2026-10-01T00:00:00.000Z' }),
    };
    const humanOperator = { resolve: sinon.stub().resolves('dima') };
    const humanAgentIdentity = { apply: sinon.stub().callsFake(async (agent: unknown) => agent) };
    const findOrCreateNovuEmail = { execute: sinon.stub().resolves({ provisionedNewLink: true }) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new SetupHumanRelay(
      agentRepository as never,
      subscriberRepository as never,
      humanContactRepository as never,
      humanOperator as never,
      humanAgentIdentity as never,
      findOrCreateNovuEmail as never,
      logger as never
    );

    return {
      usecase,
      agentRepository,
      humanContactRepository,
      humanOperator,
      humanAgentIdentity,
      subscriberRepository,
      findOrCreateNovuEmail,
      logger,
    };
  }

  const base = { environmentId: 'env1', organizationId: 'org1', userId: 'user1', subscriberId: 'alice' };

  it("saves the inviter's --via as the human's default", async () => {
    const { usecase, humanContactRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, defaultVia: HumanChannelViaEnum.TELEGRAM }));

    expect(humanContactRepository.setDefaultVia.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'relay1',
      subscriberId: 'alice',
      via: HumanChannelViaEnum.TELEGRAM,
      setBy: 'inviter',
    });
  });

  it('leaves the default alone when no channel is passed', async () => {
    const { usecase, humanContactRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(humanContactRepository.setDefaultVia.called).to.equal(false);
  });

  it('sets up the recorded operator instead of the id the caller suggests', async () => {
    const { usecase, humanOperator, subscriberRepository } = setup();

    const result = await usecase.execute(SetupHumanRelayCommand.create({ ...base, operator: true }));

    expect(humanOperator.resolve.firstCall.args).to.deep.equal([
      { environmentId: 'env1', organizationId: 'org1', agentId: 'relay1' },
      'alice',
    ]);
    expect(result.subscriberId).to.equal('dima');
    expect(subscriberRepository.findOne.firstCall.args[0].subscriberId).to.equal('dima');
  });

  it('does not write Subscriber.email during setup — the declared slot is unverified', async () => {
    const { usecase, subscriberRepository, humanContactRepository } = setup();
    subscriberRepository.findOne.onFirstCall().resolves(null);
    subscriberRepository.create = sinon.stub().resolves({ subscriberId: 'alice' });

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, email: 'Alice@Example.com' }));

    expect(subscriberRepository.create.firstCall.args[0]).to.not.have.property('email');
    expect(subscriberRepository.update.called).to.equal(false);
    expect(humanContactRepository.setDeclaredAddress.firstCall.args[0]).to.include({
      subscriberId: 'alice',
      address: 'alice@example.com',
      via: HumanChannelViaEnum.EMAIL,
    });
  });

  it('provisions an agent email inbox when the shared inbox is enabled, and still succeeds when that throws', async () => {
    const previous = {
      enterprise: process.env.NOVU_ENTERPRISE,
      selfHosted: process.env.IS_SELF_HOSTED,
      domain: process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN,
    };
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_SELF_HOSTED = 'false';
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agent.test';

    try {
      const { usecase, findOrCreateNovuEmail, logger } = setup();
      findOrCreateNovuEmail.execute.rejects(new Error('no outbound'));

      const result = await usecase.execute(SetupHumanRelayCommand.create(base));

      expect(result.agentId).to.equal('relay1');
      expect(findOrCreateNovuEmail.execute.calledOnce).to.equal(true);
      expect(findOrCreateNovuEmail.execute.firstCall.args[3]).to.equal('agent-email-inbox');
      expect(logger.warn.calledOnce).to.equal(true);
    } finally {
      restoreEnv('NOVU_ENTERPRISE', previous.enterprise);
      restoreEnv('IS_SELF_HOSTED', previous.selfHosted);
      restoreEnv('NOVU_AGENT_SHARED_INBOUND_DOMAIN', previous.domain);
    }
  });

  it('skips the inbox when the shared inbox is disabled', async () => {
    const previous = {
      enterprise: process.env.NOVU_ENTERPRISE,
      eeTest: process.env.CI_EE_TEST,
    };
    delete process.env.NOVU_ENTERPRISE;
    delete process.env.CI_EE_TEST;
    const { usecase, findOrCreateNovuEmail } = setup();

    try {
      await usecase.execute(SetupHumanRelayCommand.create(base));
      expect(findOrCreateNovuEmail.execute.called).to.equal(false);
    } finally {
      restoreEnv('NOVU_ENTERPRISE', previous.enterprise);
      restoreEnv('CI_EE_TEST', previous.eeTest);
    }
  });

  it('never asks who the operator is for anyone else', async () => {
    const { usecase, humanOperator } = setup();

    const result = await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(humanOperator.resolve.called).to.equal(false);
    expect(result.subscriberId).to.equal('alice');
  });

  it('names a new relay agent as asked', async () => {
    const { usecase, agentRepository } = setup();
    agentRepository.findOne.resolves(null);
    const create = sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' });
    Object.assign(agentRepository, { create });

    await usecase.execute(
      SetupHumanRelayCommand.create({ ...base, agentName: ' Deploy bot ', agentDescription: 'Ships the app.' })
    );

    expect(create.firstCall.args[0]).to.include({ name: 'Deploy bot', description: 'Ships the app.' });
  });

  it('calls a new relay agent "Human" until it is named', async () => {
    const { usecase, agentRepository } = setup();
    agentRepository.findOne.resolves(null);
    const create = sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' });
    Object.assign(agentRepository, { create });

    await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(create.firstCall.args[0].name).to.equal('Human');
    expect(create.firstCall.args[0]).to.not.have.property('description');
  });

  it('renames the relay agent it already has when setup runs again', async () => {
    const { usecase, humanAgentIdentity } = setup();

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, agentName: 'Deploy bot' }));

    expect(humanAgentIdentity.apply.firstCall.args[1]).to.deep.equal({ name: 'Deploy bot', description: undefined });
  });

  it('reports the mailbox when a new one was not the slug of the name', async () => {
    const savedEnterprise = process.env.NOVU_ENTERPRISE;
    const savedSelfHosted = process.env.IS_SELF_HOSTED;
    const savedDomain = process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';

    try {
      const { usecase, findOrCreateNovuEmail } = setup();
      findOrCreateNovuEmail.execute.resolves({
        provisionedNewLink: true,
        inboxHandleAdjusted: true,
        response: { integration: { sharedInboundAddress: 'atlas-acme@agentinbox.md' } },
      });

      const result = await usecase.execute(
        SetupHumanRelayCommand.create({ ...base, agentName: 'Atlas', inboxHandle: 'atlas-acme', email: 'ada@acme.co' })
      );

      expect(findOrCreateNovuEmail.execute.firstCall.args[3]).to.equal('agent-email-inbox');
      expect(findOrCreateNovuEmail.execute.firstCall.args[4]).to.deep.equal({
        inboxHandle: 'atlas-acme',
        operatorEmail: 'ada@acme.co',
      });
      expect(result.emailAddress).to.equal('atlas-acme@agentinbox.md');
      expect(result.emailHandleAdjusted).to.equal(true);
    } finally {
      restoreEnv('NOVU_ENTERPRISE', savedEnterprise);
      restoreEnv('IS_SELF_HOSTED', savedSelfHosted);
      restoreEnv('NOVU_AGENT_SHARED_INBOUND_DOMAIN', savedDomain);
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}
