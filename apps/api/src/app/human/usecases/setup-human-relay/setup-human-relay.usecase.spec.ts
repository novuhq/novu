import type { HumanContactChannelAddresses } from '@novu/dal';
import { AGENT_INBOX_EVENTS, HumanChannelViaEnum } from '@novu/shared';
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
    const analyticsService = { track: sinon.stub() };
    const usecase = new SetupHumanRelay(
      agentRepository as never,
      subscriberRepository as never,
      humanContactRepository as never,
      humanOperator as never,
      humanAgentIdentity as never,
      findOrCreateNovuEmail as never,
      logger as never,
      analyticsService as never
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
      analyticsService,
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

describe('SetupHumanRelay sign-in email', () => {
  const address = 'ada@acme.co';
  const signUp = {
    environmentId: 'env1',
    organizationId: 'org1',
    userId: 'user1',
    operator: true,
    email: 'Ada@Acme.co',
    emailVerified: true,
  };
  const requestedAt = '2026-10-30T10:00:00.000Z';
  const earlier = '2026-10-29T10:00:00.000Z';

  /** The operator's row, kept the way the repository keeps it, so a test reads what setup leaves behind. */
  function setup(stored: HumanContactChannelAddresses = {}, otherContacts: Array<{ subscriberId: string }> = []) {
    const email: HumanContactChannelAddresses = { ...stored };
    const humanContactRepository = {
      setDefaultVia: sinon.stub().resolves(),
      setDeclaredAddress: sinon.stub().callsFake(async (params: { address: string }) => {
        email.declared = { address: params.address, declaredAt: requestedAt };
      }),
      findContact: sinon.stub().callsFake(async () => ({ subscriberId: 'dima', addresses: { email } })),
      findContactsByEmailAddress: sinon.stub().callsFake(async () => [{ subscriberId: 'dima' }, ...otherContacts]),
      verifyUnclaimedAddress: sinon.stub().callsFake(async (params: { address: string }) => {
        if (email.verified || email.pending) {
          return null;
        }

        email.verified = { address: params.address, requestedAt, verifiedAt: requestedAt };

        return email.verified;
      }),
      findVerifiedAddress: sinon.stub().callsFake(async () => email.verified ?? null),
      promotePendingAddress: sinon.stub().callsFake(async (params: { address: string; requestedAt: string }) => {
        if (email.pending?.address !== params.address || email.pending.requestedAt !== params.requestedAt) {
          return null;
        }

        email.verified = { ...email.pending, verifiedAt: requestedAt };
        delete email.pending;

        return email.verified;
      }),
    };
    const subscriberRepository = {
      findOne: sinon.stub().resolves({ subscriberId: 'dima' }),
      update: sinon.stub().resolves(),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new SetupHumanRelay(
      {
        findOne: sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' }),
      } as never,
      subscriberRepository as never,
      humanContactRepository as never,
      { resolve: sinon.stub().resolves('dima') } as never,
      { apply: sinon.stub().callsFake(async (agent: unknown) => agent) } as never,
      { execute: sinon.stub().resolves({ provisionedNewLink: false }) } as never,
      logger as never,
      { track: sinon.stub() } as never
    );

    return { usecase, email, humanContactRepository, subscriberRepository, logger };
  }

  it('leaves the address as a used link leaves it: verified, on the subscriber, nothing pending', async () => {
    const { usecase, email, subscriberRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.verified).to.include({ address, requestedAt, verifiedAt: requestedAt });
    expect(email.pending).to.equal(undefined);
    expect(email.declared?.address).to.equal(address);
    expect(subscriberRepository.update.args).to.deep.equal([
      [{ subscriberId: 'dima', _environmentId: 'env1' }, { $set: { email: address } }],
    ]);
  });

  it('leaves the default channel alone, as a used link does', async () => {
    const { usecase, humanContactRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(humanContactRepository.setDefaultVia.called).to.equal(false);
  });

  it('keeps the address declared without the flag', async () => {
    const { usecase, email, humanContactRepository, subscriberRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create({ ...signUp, emailVerified: undefined }));

    expect(email.declared?.address).to.equal(address);
    expect(email.verified).to.equal(undefined);
    expect(humanContactRepository.verifyUnclaimedAddress.called).to.equal(false);
    expect(subscriberRepository.update.called).to.equal(false);
  });

  it('keeps the address declared for anyone but the operator', async () => {
    const { usecase, email, humanContactRepository, subscriberRepository } = setup();
    // Nobody else holds the address, so nothing but the operator rule keeps it declared.
    humanContactRepository.findContactsByEmailAddress.resolves([{ subscriberId: 'maya' }]);

    await usecase.execute(SetupHumanRelayCommand.create({ ...signUp, operator: undefined, subscriberId: 'maya' }));

    expect(email.declared?.address).to.equal(address);
    expect(email.verified).to.equal(undefined);
    expect(subscriberRepository.update.called).to.equal(false);
  });

  it('ignores the flag when there is no usable address', async () => {
    const { usecase, email, humanContactRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create({ ...signUp, email: 'not an address' }));

    expect(email.verified).to.equal(undefined);
    expect(humanContactRepository.findContact.called).to.equal(false);
  });

  it('never replaces a verified address, even a different one', async () => {
    const verified = { address: 'old@acme.co', requestedAt: earlier, verifiedAt: earlier };
    const { usecase, email, humanContactRepository, subscriberRepository } = setup({ verified });

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.verified).to.deep.equal(verified);
    expect(humanContactRepository.verifyUnclaimedAddress.called).to.equal(false);
    expect(humanContactRepository.promotePendingAddress.called).to.equal(false);
    expect(subscriberRepository.update.called).to.equal(false);
  });

  it('leaves a new link waiting beside a verified address', async () => {
    const pending = { address: 'new@acme.co', requestedAt: earlier };
    const verified = { address: 'old@acme.co', requestedAt: earlier, verifiedAt: earlier };
    const { usecase, email } = setup({ verified, pending });

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.verified).to.deep.equal(verified);
    expect(email.pending).to.deep.equal(pending);
  });

  it('is safe to repeat: the address stays verified as the first run left it', async () => {
    const { usecase, email, humanContactRepository, logger } = setup();

    await usecase.execute(SetupHumanRelayCommand.create(signUp));
    const firstRun = { ...email.verified };
    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.verified).to.deep.equal(firstRun);
    expect(email.pending).to.equal(undefined);
    expect(humanContactRepository.verifyUnclaimedAddress.calledOnce).to.equal(true);
    expect(logger.warn.called).to.equal(false);
  });

  it('lets a repeat call finish the subscriber write a failed run left undone', async () => {
    const { usecase, email, subscriberRepository, logger } = setup();
    subscriberRepository.update.onFirstCall().rejects(new Error('write failed'));

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.verified?.address).to.equal(address);
    expect(logger.warn.calledOnce).to.equal(true);

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(subscriberRepository.update.calledTwice).to.equal(true);
    expect(subscriberRepository.update.secondCall.args[1]).to.deep.equal({ $set: { email: address } });
  });

  it('uses up a link already on its way to this address, so that link reads as used', async () => {
    const { usecase, email, humanContactRepository } = setup({ pending: { address, requestedAt: earlier } });

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.verified).to.include({ address, requestedAt: earlier });
    expect(email.pending).to.equal(undefined);
    expect(humanContactRepository.verifyUnclaimedAddress.called).to.equal(false);
  });

  it('leaves a link on its way to another address, which the operator asked for', async () => {
    const pending = { address: 'work@acme.co', requestedAt: earlier };
    const { usecase, email, humanContactRepository, subscriberRepository } = setup({ pending });

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.pending).to.deep.equal(pending);
    expect(email.verified).to.equal(undefined);
    expect(humanContactRepository.verifyUnclaimedAddress.called).to.equal(false);
    expect(subscriberRepository.update.called).to.equal(false);
  });

  it('keeps the address declared when another contact uses it, and says so', async () => {
    const { usecase, email, humanContactRepository, subscriberRepository, logger } = setup({}, [
      { subscriberId: 'maya' },
    ]);

    const result = await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(result.subscriberId).to.equal('dima');
    expect(email.declared?.address).to.equal(address);
    expect(email.verified).to.equal(undefined);
    expect(email.pending).to.equal(undefined);
    expect(humanContactRepository.verifyUnclaimedAddress.called).to.equal(false);
    expect(subscriberRepository.update.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('leaves a request that a newer one replaced in the meantime', async () => {
    const { usecase, humanContactRepository, subscriberRepository, logger } = setup({
      pending: { address, requestedAt: earlier },
    });
    humanContactRepository.promotePendingAddress.resolves(null);

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(subscriberRepository.update.called).to.equal(false);
    expect(logger.warn.called).to.equal(false);
  });

  describe('when the contact changes after setup read it', () => {
    /** Runs `change` in the gap between setup's read of the contact and its write. */
    function changeAfterTheRead(
      humanContactRepository: ReturnType<typeof setup>['humanContactRepository'],
      change: () => void
    ) {
      humanContactRepository.findContactsByEmailAddress.callsFake(async () => {
        change();

        return [{ subscriberId: 'dima' }];
      });
    }

    it('leaves a link asked for in that gap', async () => {
      const pending = { address: 'work@acme.co', requestedAt: earlier };
      const { usecase, email, humanContactRepository, subscriberRepository, logger } = setup();
      changeAfterTheRead(humanContactRepository, () => {
        email.pending = pending;
      });

      await usecase.execute(SetupHumanRelayCommand.create(signUp));

      expect(email.pending).to.deep.equal(pending);
      expect(email.verified).to.equal(undefined);
      expect(subscriberRepository.update.called).to.equal(false);
      expect(logger.warn.called).to.equal(false);
    });

    it('never replaces an address verified in that gap', async () => {
      const verified = { address: 'work@acme.co', requestedAt: earlier, verifiedAt: earlier };
      const { usecase, email, humanContactRepository, subscriberRepository, logger } = setup();
      changeAfterTheRead(humanContactRepository, () => {
        email.verified = verified;
      });

      await usecase.execute(SetupHumanRelayCommand.create(signUp));

      expect(email.verified).to.deep.equal(verified);
      expect(subscriberRepository.update.called).to.equal(false);
      expect(logger.warn.called).to.equal(false);
    });

    it('puts the address verified now on the subscriber, not the one it read', async () => {
      const verified = { address, requestedAt: earlier, verifiedAt: earlier };
      const { usecase, humanContactRepository, subscriberRepository } = setup({ verified });
      humanContactRepository.findVerifiedAddress.resolves({ ...verified, address: 'work@acme.co' });

      await usecase.execute(SetupHumanRelayCommand.create(signUp));

      expect(subscriberRepository.update.args).to.deep.equal([
        [{ subscriberId: 'dima', _environmentId: 'env1' }, { $set: { email: 'work@acme.co' } }],
      ]);
    });

    it('follows a link confirmed while it wrote, so the subscriber keeps no old address', async () => {
      const verified = { address, requestedAt: earlier, verifiedAt: earlier };
      const { usecase, email, subscriberRepository } = setup({ verified });
      subscriberRepository.update.onFirstCall().callsFake(async () => {
        email.verified = { ...verified, address: 'work@acme.co' };
      });

      await usecase.execute(SetupHumanRelayCommand.create(signUp));

      expect(subscriberRepository.update.args.map(([, update]) => update)).to.deep.equal([
        { $set: { email: address } },
        { $set: { email: 'work@acme.co' } },
      ]);
    });
  });

  it('still sets up, with the address declared, when verifying it fails', async () => {
    const { usecase, email, humanContactRepository, subscriberRepository, logger } = setup();
    humanContactRepository.verifyUnclaimedAddress.rejects(new Error('write failed'));

    const result = await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(result.subscriberId).to.equal('dima');
    expect(email.declared?.address).to.equal(address);
    expect(email.verified).to.equal(undefined);
    expect(email.pending).to.equal(undefined);
    expect(subscriberRepository.update.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('keeps a link that was already out when promoting it fails', async () => {
    const pending = { address, requestedAt: earlier };
    const { usecase, email, humanContactRepository } = setup({ pending });
    humanContactRepository.promotePendingAddress.rejects(new Error('write failed'));

    await usecase.execute(SetupHumanRelayCommand.create(signUp));

    expect(email.pending).to.deep.equal(pending);
  });

  for (const [what, method] of [
    ['reading the contact', 'findContact'],
    ['looking for another contact with the address', 'findContactsByEmailAddress'],
  ] as const) {
    it(`still sets up when ${what} fails`, async () => {
      const { usecase, email, humanContactRepository, logger } = setup();
      humanContactRepository[method].rejects(new Error('database down'));

      const result = await usecase.execute(SetupHumanRelayCommand.create(signUp));

      expect(result.subscriberId).to.equal('dima');
      expect(email.declared?.address).to.equal(address);
      expect(email.verified).to.equal(undefined);
      expect(logger.warn.calledOnce).to.equal(true);
    });
  }
});

describe('SetupHumanRelay analytics', () => {
  const base = { environmentId: 'env1', organizationId: 'org1', userId: 'user1', subscriberId: 'alice' };
  const names = ['NOVU_ENTERPRISE', 'IS_SELF_HOSTED', 'NOVU_AGENT_SHARED_INBOUND_DOMAIN', 'KEYLESS_ORGANIZATION_ID'];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentinbox.md';
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless-org';
  });

  afterEach(() => {
    for (const name of names) {
      restoreEnv(name, saved[name]);
    }
  });

  function setup(provisioned: { provisionedNewLink: boolean; response?: unknown }) {
    const analyticsService = { track: sinon.stub() };
    const usecase = new SetupHumanRelay(
      {
        findOne: sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' }),
      } as never,
      { findOne: sinon.stub().resolves({ subscriberId: 'alice' }), update: sinon.stub() } as never,
      { setDefaultVia: sinon.stub(), setDeclaredAddress: sinon.stub() } as never,
      { resolve: sinon.stub() } as never,
      { apply: sinon.stub().callsFake(async (agent: unknown) => agent) } as never,
      { execute: sinon.stub().resolves(provisioned) } as never,
      { setContext: sinon.stub(), warn: sinon.stub() } as never,
      analyticsService as never
    );

    return { usecase, analyticsService };
  }

  const newInbox = {
    provisionedNewLink: true,
    response: { integration: { sharedInboundAddress: 'atlas@agentinbox.md' } },
  };

  it('counts a new inbox, and its email channel, for the owner and the app that asked', async () => {
    const { usecase, analyticsService } = setup(newInbox);

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, analyticsSource: 'cli' }));

    expect(analyticsService.track.args).to.deep.equal([
      [AGENT_INBOX_EVENTS.INBOX_CREATED, 'user1', { _organization: 'org1', agentId: 'relay1', source: 'cli' }],
      [AGENT_INBOX_EVENTS.CHANNEL_CONNECTED, 'user1', { _organization: 'org1', agentId: 'relay1', channel: 'email' }],
    ]);
  });

  it('says a request without a source came from the API', async () => {
    const { usecase, analyticsService } = setup(newInbox);

    await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(analyticsService.track.firstCall.args[2]).to.include({ source: 'api' });
  });

  it('counts nothing when the agent had its inbox already', async () => {
    const { usecase, analyticsService } = setup({ provisionedNewLink: false });

    await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(analyticsService.track.called).to.equal(false);
  });

  it('counts nothing for a setup made without an account', async () => {
    const { usecase, analyticsService } = setup(newInbox);

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, organizationId: 'keyless-org' }));

    expect(analyticsService.track.called).to.equal(false);
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}
