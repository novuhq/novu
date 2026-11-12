import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  ENDPOINT_TYPES,
  HumanAddressVerificationStateEnum,
  HumanChannelViaEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE } from '../../keyless/keyless-email-gate.service';
import { HumanChannelGate } from './human-channel-gate.service';
import { HumanDeliveryService, pickDefaultTarget, type ReachableHumanTarget } from './human-delivery.service';
import { WhatsAppUndeliverableException } from './whatsapp-delivery.errors';

function channelGate(whatsAppEnabled = false) {
  return new HumanChannelGate({ getFlag: sinon.stub().resolves(whatsAppEnabled) } as never);
}

function emailGate(blocked = false) {
  return {
    isBlocked: sinon.stub().returns(blocked),
    assertAllowed: blocked
      ? sinon.stub().rejects(
          new ForbiddenException({
            code: KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE,
            message: 'Outbound email needs a Human account.',
          })
        )
      : sinon.stub().resolves(),
  };
}

/** WhatsApp's window, open unless a test says otherwise. */
function whatsAppWindow(window: { open: boolean; closesAt?: string } = { open: true }) {
  return { describe: sinon.stub().resolves(window) };
}

/** The account's first message: approved under `approvedName`, or none. */
function firstMessageService(approvedName?: string) {
  return {
    read: sinon
      .stub()
      .resolves(
        approvedName
          ? { status: 'APPROVED', body: 'Hi from {{agent_name}}', approved: { name: approvedName, body: 'Hi' } }
          : undefined
      ),
  };
}

/** The service lists a person's endpoints; these specs stub the one lookup, so the list is that one, or none. */
function withFind<Repository extends { findOne: sinon.SinonStub }>(repository: Repository) {
  return Object.assign(repository, {
    find: async (query: unknown) => {
      const endpoint = await repository.findOne(query);

      return endpoint ? [endpoint] : [];
    },
  });
}

describe('HumanDeliveryService.resolveChannel', () => {
  function setup() {
    const agentIntegrationRepository = { find: sinon.stub() };
    const channelEndpointRepository = { findOne: sinon.stub().resolves(null) };
    const integrationRepository = { find: sinon.stub() };
    const humanContactRepository = {
      findContact: sinon.stub().resolves(null),
      findVerifiedAddress: sinon.stub().resolves(null),
      findPendingAddress: sinon.stub().resolves(null),
      find: sinon.stub().resolves([]),
    };
    const outboundGateway = { sendDirectMessage: sinon.stub() };
    const keylessEmailGate = emailGate();
    const service = new HumanDeliveryService(
      agentIntegrationRepository as never,
      withFind(channelEndpointRepository) as never,
      integrationRepository as never,
      humanContactRepository as never,
      outboundGateway as never,
      keylessEmailGate as never,
      channelGate() as never,
      whatsAppWindow() as never,
      firstMessageService() as never,
      {} as never
    );

    return {
      service,
      agentIntegrationRepository,
      channelEndpointRepository,
      integrationRepository,
      humanContactRepository,
      keylessEmailGate,
    };
  }

  const params = {
    environmentId: 'env1',
    organizationId: 'org1',
    agentId: 'agent1',
    subscriberId: 'alice',
  };

  it('keeps setup copy when the agent has no linked channels', async () => {
    const { service, agentIntegrationRepository } = setup();
    agentIntegrationRepository.find.resolves([]);

    try {
      await service.resolveChannel(params);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.include('npx @agentinbox/cli setup');
      expect((err as NotFoundException).message).to.not.include('human contact invite');
    }
  });

  it('tells the caller to invite the human when they have no endpoint', async () => {
    const { service, agentIntegrationRepository, integrationRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'telegram-main',
        providerId: ChatProviderIdEnum.Telegram,
        channel: ChannelTypeEnum.CHAT,
      },
    ]);

    try {
      await service.resolveChannel(params);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.equal(
        'Human "alice" has no linked channel. Run `human contact invite alice`.'
      );
    }
  });

  it('includes --via on the invite hint when a channel was requested', async () => {
    const { service, agentIntegrationRepository, integrationRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'telegram-main',
        providerId: ChatProviderIdEnum.Telegram,
        channel: ChannelTypeEnum.CHAT,
      },
    ]);

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.TELEGRAM });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.equal(
        'Human "alice" has no linked telegram endpoint. Run `human contact invite alice --via telegram`.'
      );
    }
  });

  it('tells the caller to invite on email when there is no verified address', async () => {
    const { service, agentIntegrationRepository, integrationRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'email-main',
        providerId: 'agent-email-inbox',
        channel: ChannelTypeEnum.EMAIL,
      },
    ]);

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.EMAIL });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.equal(
        'Human "alice" has no confirmed email address. Run `human contact invite alice --via email`.'
      );
    }
  });

  it('tells the caller a pending email is awaiting verification', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'email-main',
        providerId: 'agent-email-inbox',
        channel: ChannelTypeEnum.EMAIL,
      },
    ]);
    humanContactRepository.findPendingAddress.resolves({
      address: 'alice@example.com',
      requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.EMAIL });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.include('waiting to be confirmed');
      expect((err as NotFoundException).message).to.include('a***@example.com');
    }
  });

  it('delivers email only when HumanContact has a verified address', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'email-main',
        providerId: 'agent-email-inbox',
        channel: ChannelTypeEnum.EMAIL,
      },
    ]);
    humanContactRepository.findVerifiedAddress.resolves({
      address: 'alice@example.com',
      requestedAt: '2026-09-01T10:00:00.000Z',
      verifiedAt: '2026-09-01T10:05:00.000Z',
    });

    const target = await service.resolveChannel({ ...params, via: HumanChannelViaEnum.EMAIL });

    expect(target).to.deep.equal({
      platform: 'email',
      platformUserId: 'alice@example.com',
      integrationIdentifier: 'email-main',
    });
  });

  it('delivers a typed address without reading the verified slot', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'email-main',
        providerId: 'agent-email-inbox',
        channel: ChannelTypeEnum.EMAIL,
      },
    ]);
    humanContactRepository.findVerifiedAddress.resolves({
      address: 'old@example.com',
      requestedAt: '2026-09-01T10:00:00.000Z',
      verifiedAt: '2026-09-01T10:05:00.000Z',
    });

    const target = await service.resolveChannel({
      ...params,
      via: HumanChannelViaEnum.EMAIL,
      explicitEmail: 'new@example.com',
    });

    expect(target).to.deep.equal({
      platform: 'email',
      platformUserId: 'new@example.com',
      integrationIdentifier: 'email-main',
    });
    expect(humanContactRepository.findVerifiedAddress.called).to.equal(false);
  });

  it('refuses a typed address for a keyless org before choosing an integration', async () => {
    const { service, agentIntegrationRepository, keylessEmailGate } = setup();
    keylessEmailGate.isBlocked.returns(true);
    keylessEmailGate.assertAllowed.rejects(
      new ForbiddenException({
        code: KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE,
        message: 'Outbound email needs a Human account.',
      })
    );

    try {
      await service.resolveChannel({ ...params, explicitEmail: 'ada@acme.com' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
    }

    expect(agentIntegrationRepository.find.called).to.equal(false);
  });

  it('keeps a verified email deliverable while a newer pending address is outstanding', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'email-main',
        providerId: 'agent-email-inbox',
        channel: ChannelTypeEnum.EMAIL,
      },
    ]);
    humanContactRepository.findVerifiedAddress.resolves({
      address: 'old@example.com',
      requestedAt: '2026-09-01T10:00:00.000Z',
      verifiedAt: '2026-09-01T10:05:00.000Z',
    });
    humanContactRepository.findPendingAddress.resolves({
      address: 'new@example.com',
      requestedAt: '2026-09-02T10:00:00.000Z',
    });

    const target = await service.resolveChannel({ ...params, via: HumanChannelViaEnum.EMAIL });

    expect(target.platformUserId).to.equal('old@example.com');
  });

  it('lists a contact as reachable on email only after that relay verified the address', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int-email' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int-email',
        identifier: 'email-main',
        providerId: EmailProviderIdEnum.AgentEmailInbox,
        channel: ChannelTypeEnum.EMAIL,
      },
    ]);
    humanContactRepository.find.resolves([
      {
        subscriberId: 'alice',
        addresses: {
          [HumanChannelViaEnum.EMAIL]: {
            verified: { address: 'alice@example.com', requestedAt: 't1', verifiedAt: 't2' },
          },
        },
      },
      {
        subscriberId: 'bob',
        addresses: {
          [HumanChannelViaEnum.EMAIL]: {
            pending: { address: 'bob@example.com', requestedAt: 't1' },
          },
        },
      },
    ]);

    const reach = await service.describeReachabilityForMany({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'agent1',
      subscribers: [
        { subscriberId: 'alice', email: 'other@example.com' },
        { subscriberId: 'bob', email: 'bob@example.com' },
      ],
    });

    expect(reach.get('alice')?.targets).to.deep.equal([
      {
        via: HumanChannelViaEnum.EMAIL,
        platform: HumanChannelViaEnum.EMAIL,
        platformUserId: 'alice@example.com',
        integrationIdentifier: 'email-main',
        connectedAt: 't2',
      },
    ]);
    expect(reach.get('bob')?.targets).to.deep.equal([]);
  });

  describe('when the human is reachable on several channels', () => {
    function setupTelegramAndSlack() {
      const context = setup();
      context.agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }, { _integrationId: 'int2' }]);
      context.integrationRepository.find.resolves([
        {
          _id: 'int1',
          identifier: 'telegram-main',
          providerId: ChatProviderIdEnum.Telegram,
          channel: ChannelTypeEnum.CHAT,
          active: true,
        },
        {
          _id: 'int2',
          identifier: 'slack-main',
          providerId: ChatProviderIdEnum.Slack,
          channel: ChannelTypeEnum.CHAT,
          active: true,
        },
      ]);
      // Slack was connected first.
      context.channelEndpointRepository.findOne
        .withArgs(sinon.match({ integrationIdentifier: 'telegram-main' }))
        .resolves({
          type: ENDPOINT_TYPES.TELEGRAM_CHAT,
          endpoint: { chatId: '111' },
          createdAt: '2026-09-02T10:00:00.000Z',
        });
      context.channelEndpointRepository.findOne
        .withArgs(sinon.match({ integrationIdentifier: 'slack-main' }))
        .resolves({
          type: ENDPOINT_TYPES.SLACK_USER,
          endpoint: { userId: 'U1' },
          createdAt: '2026-09-01T10:00:00.000Z',
        });

      return context;
    }

    it('delivers to the saved default channel', async () => {
      const { service, humanContactRepository } = setupTelegramAndSlack();
      humanContactRepository.findContact.resolves({ defaultVia: HumanChannelViaEnum.TELEGRAM });

      const target = await service.resolveChannel(params);

      expect(target).to.deep.equal({
        platform: 'telegram',
        platformUserId: '111',
        integrationIdentifier: 'telegram-main',
      });
      expect(humanContactRepository.findContact.calledWith('env1', 'agent1', 'alice')).to.equal(true);
    });

    it('delivers to the channel connected first when no default is saved', async () => {
      const { service } = setupTelegramAndSlack();

      const target = await service.resolveChannel(params);

      expect(target).to.deep.equal({ platform: 'slack', platformUserId: 'U1', integrationIdentifier: 'slack-main' });
    });

    it('delivers to the channel connected first when the saved default is no longer connected', async () => {
      const { service, humanContactRepository } = setupTelegramAndSlack();
      humanContactRepository.findContact.resolves({ defaultVia: HumanChannelViaEnum.EMAIL });

      const target = await service.resolveChannel(params);

      expect(target.integrationIdentifier).to.equal('slack-main');
    });

    it('lets an explicit via win over the default', async () => {
      const { service, humanContactRepository } = setupTelegramAndSlack();
      humanContactRepository.findContact.resolves({ defaultVia: HumanChannelViaEnum.SLACK });

      const target = await service.resolveChannel({ ...params, via: HumanChannelViaEnum.TELEGRAM });

      expect(target.integrationIdentifier).to.equal('telegram-main');
    });

    it('describes which channels are connected and which one is the default', async () => {
      const { service, humanContactRepository } = setupTelegramAndSlack();
      humanContactRepository.findContact.resolves({ defaultVia: HumanChannelViaEnum.TELEGRAM });

      const { targets, defaultVia } = await service.describeReachability(params);

      expect(targets.map((target) => target.integrationIdentifier)).to.deep.equal(['telegram-main', 'slack-main']);
      expect(defaultVia).to.equal(HumanChannelViaEnum.TELEGRAM);
    });
  });
});

describe('HumanDeliveryService keyless email', () => {
  function keylessService() {
    const agentIntegrationRepository = {
      find: sinon.stub().resolves([{ _integrationId: 'email1' }, { _integrationId: 'tg1' }]),
    };
    const channelEndpointRepository = {
      findOne: sinon.stub().resolves({
        subscriberId: 'alice',
        integrationIdentifier: 'telegram-main',
        type: ENDPOINT_TYPES.TELEGRAM_CHAT,
        endpoint: { chatId: '111' },
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    };
    const integrationRepository = {
      find: sinon.stub().resolves([
        {
          _id: 'email1',
          identifier: 'email-main',
          providerId: EmailProviderIdEnum.AgentEmailInbox,
          channel: ChannelTypeEnum.EMAIL,
          active: true,
        },
        {
          _id: 'tg1',
          identifier: 'telegram-main',
          providerId: ChatProviderIdEnum.Telegram,
          channel: ChannelTypeEnum.CHAT,
          active: true,
        },
      ]),
    };
    const humanContactRepository = {
      findContact: sinon.stub().resolves(null),
      findVerifiedAddress: sinon
        .stub()
        .resolves({ address: 'ada@example.com', verifiedAt: '2026-01-02T00:00:00.000Z' }),
      findPendingAddress: sinon.stub().resolves(null),
      find: sinon.stub().resolves([]),
    };
    const keylessEmailGate = emailGate(true);
    const service = new HumanDeliveryService(
      agentIntegrationRepository as never,
      withFind(channelEndpointRepository) as never,
      integrationRepository as never,
      humanContactRepository as never,
      { sendDirectMessage: sinon.stub() } as never,
      keylessEmailGate as never,
      channelGate() as never,
      whatsAppWindow() as never,
      firstMessageService() as never,
      {} as never
    );

    return { service, humanContactRepository, agentIntegrationRepository, integrationRepository, keylessEmailGate };
  }

  const params = {
    environmentId: 'env1',
    organizationId: 'keyless-org',
    agentId: 'agent1',
    subscriberId: 'alice',
  };

  it('does not treat a verified email as reachable and falls back to Telegram', async () => {
    const { service } = keylessService();

    const target = await service.resolveChannel(params);

    expect(target.integrationIdentifier).to.equal('telegram-main');
  });

  it('raises the claim error when email is the only channel', async () => {
    const { service, agentIntegrationRepository, integrationRepository, keylessEmailGate } = keylessService();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'email1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'email1',
        identifier: 'email-main',
        providerId: EmailProviderIdEnum.AgentEmailInbox,
        channel: ChannelTypeEnum.EMAIL,
        active: true,
      },
    ]);

    try {
      await service.resolveChannel(params);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
    }

    expect(keylessEmailGate.assertAllowed.calledOnce).to.equal(true);
  });

  it('raises the claim error when email is requested explicitly', async () => {
    const { service } = keylessService();

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.EMAIL });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).to.include({ code: KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE });
    }
  });

  it('marks email unavailable on the invite page', async () => {
    const { service, humanContactRepository } = keylessService();
    humanContactRepository.findContact.resolves({
      addresses: {
        [HumanChannelViaEnum.EMAIL]: {
          verified: {
            address: 'ada@example.com',
            requestedAt: '2026-01-01T00:00:00.000Z',
            verifiedAt: '2026-01-02T00:00:00.000Z',
          },
        },
      },
    });

    const channels = await service.describeInviteChannels(params);
    const email = channels.find((channel) => channel.via === HumanChannelViaEnum.EMAIL);

    expect(email).to.include({
      available: false,
      connected: false,
      status: HumanAddressVerificationStateEnum.VERIFIED,
      verifiedRequestedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(channels.find((channel) => channel.via === HumanChannelViaEnum.TELEGRAM)?.connected).to.equal(true);
  });
});

describe('HumanDeliveryService.listInviteChannels', () => {
  it('offers active Telegram, Slack, and Email integrations, once per app', async () => {
    const agentIntegrationRepository = {
      find: sinon.stub().resolves([1, 2, 3, 4, 5].map((n) => ({ _integrationId: `int${n}` }))),
    };
    const integrationRepository = {
      find: sinon.stub().resolves([
        { identifier: 'email-main', providerId: 'agent-email-inbox', channel: ChannelTypeEnum.EMAIL, active: true },
        { identifier: 'slack-old', providerId: ChatProviderIdEnum.Slack, channel: ChannelTypeEnum.CHAT, active: false },
        { identifier: 'slack-main', providerId: ChatProviderIdEnum.Slack, channel: ChannelTypeEnum.CHAT, active: true },
        {
          identifier: 'slack-other',
          providerId: ChatProviderIdEnum.Slack,
          channel: ChannelTypeEnum.CHAT,
          active: true,
        },
        { identifier: 'tg-main', providerId: ChatProviderIdEnum.Telegram, channel: ChannelTypeEnum.CHAT, active: true },
      ]),
    };
    const service = new HumanDeliveryService(
      agentIntegrationRepository as never,
      {} as never,
      integrationRepository as never,
      {} as never,
      {} as never,
      emailGate() as never,
      channelGate() as never,
      whatsAppWindow() as never,
      firstMessageService() as never,
      {} as never
    );

    const channels = await service.listInviteChannels({ environmentId: 'env1', organizationId: 'org1', agentId: 'a1' });

    expect(channels).to.deep.equal([
      { via: HumanChannelViaEnum.EMAIL, integrationIdentifier: 'email-main' },
      { via: HumanChannelViaEnum.SLACK, integrationIdentifier: 'slack-main' },
      { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg-main' },
    ]);
  });
});

describe('HumanDeliveryService.listWorkingChannels', () => {
  it('lists email once the agent has its address, and Telegram or Slack once someone linked a chat', async () => {
    const agentIntegrationRepository = {
      find: sinon.stub().resolves([1, 2, 3].map((n) => ({ _integrationId: `int${n}` }))),
    };
    const integrationRepository = {
      find: sinon.stub().resolves([
        { identifier: 'email-main', providerId: 'agent-email-inbox', channel: ChannelTypeEnum.EMAIL, credentials: {} },
        { identifier: 'slack-main', providerId: ChatProviderIdEnum.Slack, channel: ChannelTypeEnum.CHAT },
        { identifier: 'tg-main', providerId: ChatProviderIdEnum.Telegram, channel: ChannelTypeEnum.CHAT },
      ]),
    };
    const channelEndpointRepository = {
      findOne: sinon
        .stub()
        .callsFake(async ({ integrationIdentifier }) =>
          integrationIdentifier === 'tg-main' ? { _id: 'chat1' } : null
        ),
    };
    const service = new HumanDeliveryService(
      agentIntegrationRepository as never,
      withFind(channelEndpointRepository) as never,
      integrationRepository as never,
      {} as never,
      {} as never,
      emailGate() as never,
      channelGate() as never,
      whatsAppWindow() as never,
      firstMessageService() as never,
      {} as never
    );

    const channels = await service.listWorkingChannels({
      environmentId: 'env1',
      organizationId: 'org1',
      agent: { _id: 'a1', identifier: 'human-relay', name: 'Human' },
    });

    expect(channels).to.deep.equal([HumanChannelViaEnum.TELEGRAM]);
  });
});

describe('pickDefaultTarget', () => {
  const telegram: ReachableHumanTarget = {
    via: HumanChannelViaEnum.TELEGRAM,
    platform: 'telegram',
    platformUserId: '111',
    integrationIdentifier: 'telegram-main',
    connectedAt: '2026-09-02T10:00:00.000Z',
  };
  const email: ReachableHumanTarget = {
    via: HumanChannelViaEnum.EMAIL,
    platform: 'email',
    platformUserId: 'alice@example.com',
    integrationIdentifier: 'email-main',
  };

  it('puts email, which has no connect time, after chat channels', () => {
    expect(pickDefaultTarget([email, telegram])).to.equal(telegram);
  });

  it('puts email after chat channels even when it was verified first', () => {
    const verifiedAtSignUp = { ...email, connectedAt: '2026-09-01T10:00:00.000Z' };

    expect(pickDefaultTarget([verifiedAtSignUp, telegram])).to.equal(telegram);
  });

  it('uses email when nothing else is connected', () => {
    expect(pickDefaultTarget([email])).to.equal(email);
  });

  it('falls back on a chat channel when the saved default is gone, whatever email’s date', () => {
    const verifiedAtSignUp = { ...email, connectedAt: '2026-09-01T10:00:00.000Z' };

    expect(pickDefaultTarget([verifiedAtSignUp, telegram], HumanChannelViaEnum.SLACK)).to.equal(telegram);
  });

  it('uses the saved default even when it is email', () => {
    expect(pickDefaultTarget([email, telegram], HumanChannelViaEnum.EMAIL)).to.equal(email);
  });

  it('returns undefined when the human is not reachable', () => {
    expect(pickDefaultTarget([])).to.equal(undefined);
  });
});

describe('HumanDeliveryService on WhatsApp', () => {
  const params = { environmentId: 'env1', organizationId: 'org1', agentId: 'agent1', subscriberId: 'alice' };
  const whatsApp = {
    _id: 'int-wa',
    identifier: 'whatsapp-main',
    providerId: ChatProviderIdEnum.WhatsAppBusiness,
    channel: ChannelTypeEnum.CHAT,
    active: true,
  };
  const telegram = {
    _id: 'int-tg',
    identifier: 'tg-main',
    providerId: ChatProviderIdEnum.Telegram,
    channel: ChannelTypeEnum.CHAT,
    active: true,
  };

  function setup(
    whatsAppEnabled: boolean,
    integrations: unknown[] = [whatsApp, telegram],
    window: { open: boolean; closesAt?: string } = { open: true },
    approvedFirstMessage?: string
  ) {
    const getFlag = sinon.stub().resolves(whatsAppEnabled);
    const channelEndpointRepository = { findOne: sinon.stub().resolves(null) };
    const windows = whatsAppWindow(window);
    const service = new HumanDeliveryService(
      { find: sinon.stub().resolves(integrations.map((_, n) => ({ _integrationId: `int${n}` }))) } as never,
      withFind(channelEndpointRepository) as never,
      { find: sinon.stub().resolves(integrations) } as never,
      { findContact: sinon.stub().resolves(null), find: sinon.stub().resolves([]) } as never,
      {} as never,
      emailGate() as never,
      new HumanChannelGate({ getFlag } as never),
      windows as never,
      firstMessageService(approvedFirstMessage) as never,
      {} as never
    );

    return { service, channelEndpointRepository, getFlag, windows };
  }

  const PROVED_WHATSAPP = {
    type: ENDPOINT_TYPES.PHONE,
    providerId: ChatProviderIdEnum.WhatsAppBusiness,
    endpoint: { phoneNumber: '+15551234567', provedAt: '2026-11-01T10:00:00.000Z' },
    createdAt: '2026-11-01T10:00:00.000Z',
  };
  const TELEGRAM_CHAT = {
    type: ENDPOINT_TYPES.TELEGRAM_CHAT,
    endpoint: { chatId: '42' },
    createdAt: '2026-11-02T10:00:00.000Z',
  };

  /** Alice on both apps: WhatsApp proved first, so it is her default when nothing else says. */
  function onBoth(channelEndpointRepository: { findOne: sinon.SinonStub }, { telegramToo = true } = {}) {
    channelEndpointRepository.findOne.callsFake(async (query: { integrationIdentifier: string }) => {
      if (query.integrationIdentifier === 'whatsapp-main') {
        return PROVED_WHATSAPP;
      }

      return telegramToo ? TELEGRAM_CHAT : null;
    });
  }

  async function refusal(promise: Promise<unknown>) {
    const error = await promise.catch((err: unknown) => err);
    expect(error).to.be.instanceOf(WhatsAppUndeliverableException);

    return (error as WhatsAppUndeliverableException).getResponse() as Record<string, unknown>;
  }

  it('sends on WhatsApp inside the window, with the number’s proof as the window’s start', async () => {
    const { service, channelEndpointRepository, windows } = setup(true);
    onBoth(channelEndpointRepository);

    const target = await service.resolveChannel({ ...params, buttons: 2 });

    expect(target).to.include({ platform: HumanChannelViaEnum.WHATSAPP, platformUserId: '15551234567' });
    expect(windows.describe.firstCall.args[2]).to.deep.equal({
      waId: '15551234567',
      provedAt: '2026-11-01T10:00:00.000Z',
    });
  });

  it('falls back to their next channel when the window is shut and no channel was asked for', async () => {
    const { service, channelEndpointRepository } = setup(true, [whatsApp, telegram], {
      open: false,
      closesAt: '2026-11-02T10:00:00.000Z',
    });
    onBoth(channelEndpointRepository);

    const target = await service.resolveChannel(params);

    expect(target).to.include({ platform: HumanChannelViaEnum.TELEGRAM, platformUserId: '42' });
  });

  it('refuses WhatsApp when it was asked for and the window is shut, naming the channels that still work', async () => {
    const { service, channelEndpointRepository } = setup(true, [whatsApp, telegram], {
      open: false,
      closesAt: '2026-11-02T10:00:00.000Z',
    });
    onBoth(channelEndpointRepository);

    const body = await refusal(service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP }));

    expect(body).to.include({
      code: 'whatsapp_window_closed',
      subscriberId: 'alice',
      windowClosedAt: '2026-11-02T10:00:00.000Z',
    });
    expect(body.availableChannels).to.deep.equal([HumanChannelViaEnum.TELEGRAM]);
    expect(String(body.message)).to.contain('--via telegram');
  });

  it('refuses even without a channel asked for when WhatsApp is all they have', async () => {
    const { service, channelEndpointRepository } = setup(true, [whatsApp, telegram], { open: false });
    onBoth(channelEndpointRepository, { telegramToo: false });

    const body = await refusal(service.resolveChannel(params));

    expect(body).to.include({ code: 'whatsapp_window_closed' });
    expect(body.availableChannels).to.deep.equal([]);
  });

  it('sends the approved first message instead of refusing, when WhatsApp was asked for and the window is shut', async () => {
    const { service, channelEndpointRepository } = setup(
      true,
      [whatsApp, telegram],
      { open: false },
      'agentinbox_first_message'
    );
    onBoth(channelEndpointRepository);

    const target = await service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP });

    expect(target).to.deep.include({
      platform: 'whatsapp',
      integrationIdentifier: 'whatsapp-main',
      firstMessage: { templateName: 'agentinbox_first_message', body: 'Hi' },
    });
  });

  it('sends the approved first message when WhatsApp is all they have and the window is shut', async () => {
    const { service, channelEndpointRepository } = setup(
      true,
      [whatsApp, telegram],
      { open: false },
      'agentinbox_first_message_2'
    );
    onBoth(channelEndpointRepository, { telegramToo: false });

    const target = await service.resolveChannel(params);

    expect(target.firstMessage).to.deep.equal({ templateName: 'agentinbox_first_message_2', body: 'Hi' });
  });

  it('still prefers their next channel over the first message when no channel was asked for', async () => {
    const { service, channelEndpointRepository } = setup(
      true,
      [whatsApp, telegram],
      { open: false },
      'agentinbox_first_message'
    );
    onBoth(channelEndpointRepository);

    const target = await service.resolveChannel(params);

    expect(target).to.include({ platform: HumanChannelViaEnum.TELEGRAM });
    expect(target.firstMessage).to.equal(undefined);
  });

  it('still refuses too many buttons when a first message is approved', async () => {
    const { service, channelEndpointRepository } = setup(
      true,
      [whatsApp, telegram],
      { open: true },
      'agentinbox_first_message'
    );
    onBoth(channelEndpointRepository);

    const body = await refusal(service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP, buttons: 4 }));

    expect(body).to.include({ code: 'whatsapp_too_many_buttons' });
  });

  it('refuses a card with more buttons than WhatsApp shows, instead of losing some', async () => {
    const { service, channelEndpointRepository } = setup(true);
    onBoth(channelEndpointRepository);

    const body = await refusal(service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP, buttons: 4 }));

    expect(body).to.include({ code: 'whatsapp_too_many_buttons', maxButtons: 3, buttons: 4 });
    expect(body.availableChannels).to.deep.equal([HumanChannelViaEnum.TELEGRAM]);
  });

  it('sends a card with three buttons on WhatsApp, and moves a bigger one to their next channel', async () => {
    const { service, channelEndpointRepository } = setup(true);
    onBoth(channelEndpointRepository);

    expect(await service.resolveChannel({ ...params, buttons: 3 })).to.include({ platform: 'whatsapp' });
    expect(await service.resolveChannel({ ...params, buttons: 4 })).to.include({ platform: 'telegram' });
  });

  it('counts an old code sent again as a message, since it opened the window too', async () => {
    const { service, channelEndpointRepository, windows } = setup(true);
    channelEndpointRepository.findOne.callsFake(async (query: { integrationIdentifier: string }) =>
      query.integrationIdentifier === 'whatsapp-main'
        ? {
            ...PROVED_WHATSAPP,
            endpoint: { ...PROVED_WHATSAPP.endpoint, lastCodeAt: '2026-11-10T09:00:00.000Z' },
          }
        : null
    );

    await service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP });

    expect(windows.describe.firstCall.args[2]).to.deep.equal({
      waId: '15551234567',
      provedAt: '2026-11-10T09:00:00.000Z',
    });
  });

  it('checks a WhatsApp thread for the person it is with, counting their proof and code messages', async () => {
    const { service, channelEndpointRepository, windows } = setup(true, [whatsApp, telegram], {
      open: false,
      closesAt: '2026-11-10T10:00:00.000Z',
    });
    Object.assign(channelEndpointRepository, {
      find: async () => [
        { ...PROVED_WHATSAPP, endpoint: { phoneNumber: '+15550000000', provedAt: '2026-11-09T09:00:00.000Z' } },
        PROVED_WHATSAPP,
      ],
    });

    const unfit = await service.whatsAppThreadUnfit({
      ...params,
      integrationId: 'int-wa',
      platformThreadId: 'whatsapp:1234:15551234567',
      buttons: 2,
    });

    expect(unfit).to.deep.equal({ reason: 'whatsapp_window_closed', windowClosedAt: '2026-11-10T10:00:00.000Z' });
    expect(windows.describe.firstCall.args[2]).to.deep.equal({
      waId: '15551234567',
      provedAt: '2026-11-01T10:00:00.000Z',
    });
    expect(
      await service.whatsAppThreadUnfit({
        ...params,
        integrationId: 'int-wa',
        platformThreadId: 'whatsapp:1234:15551234567',
        buttons: 4,
      })
    ).to.deep.equal({ reason: 'whatsapp_too_many_buttons', buttons: 4 });
  });

  it('tells the contact list whether WhatsApp can be written to right now', async () => {
    const { service, channelEndpointRepository, windows } = setup(true);
    Object.assign(channelEndpointRepository, {
      find: async () => [{ ...PROVED_WHATSAPP, subscriberId: 'alice', integrationIdentifier: 'whatsapp-main' }],
    });
    const window = { open: false, lastMessageAt: '2026-11-01T10:00:00.000Z', closesAt: '2026-11-02T10:00:00.000Z' };
    Object.assign(windows, { describeMany: sinon.stub().resolves(new Map([['15551234567', window]])) });

    const reach = await service.describeReachabilityForMany({ ...params, subscribers: [{ subscriberId: 'alice' }] });

    const whatsAppTarget = reach.get('alice')?.targets.find((target) => target.via === HumanChannelViaEnum.WHATSAPP);
    expect(whatsAppTarget?.window).to.deep.equal(window);
  });

  it('reaches a number bound with a wa.me code on the WhatsApp Business integration', async () => {
    const { service, channelEndpointRepository } = setup(true);
    channelEndpointRepository.findOne.callsFake(async (query: { integrationIdentifier: string }) =>
      query.integrationIdentifier === 'whatsapp-main'
        ? {
            type: ENDPOINT_TYPES.PHONE,
            providerId: ChatProviderIdEnum.WhatsAppBusiness,
            endpoint: { phoneNumber: '+15551234567', displayName: 'Alice', provedAt: '2026-11-01T10:00:00.000Z' },
            createdAt: '2026-11-01T10:00:00.000Z',
          }
        : null
    );

    const target = await service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP });

    expect(target).to.include({
      platform: HumanChannelViaEnum.WHATSAPP,
      // Addressed by wa_id, as WhatsApp names the person and keys their threads.
      platformUserId: '15551234567',
      integrationIdentifier: 'whatsapp-main',
    });
  });

  it('reaches the proved number behind an older one without proof, connected when it was proved', async () => {
    const { service, channelEndpointRepository } = setup(true);
    Object.assign(channelEndpointRepository, {
      find: async (query: { integrationIdentifier: string }) =>
        query.integrationIdentifier === 'whatsapp-main'
          ? [
              {
                type: ENDPOINT_TYPES.PHONE,
                providerId: ChatProviderIdEnum.WhatsAppBusiness,
                endpoint: { phoneNumber: '+15550000000' },
                createdAt: '2026-10-01T10:00:00.000Z',
              },
              {
                type: ENDPOINT_TYPES.PHONE,
                providerId: ChatProviderIdEnum.WhatsAppBusiness,
                endpoint: { phoneNumber: '+15551234567', provedAt: '2026-11-05T10:00:00.000Z' },
                createdAt: '2026-10-02T10:00:00.000Z',
              },
            ]
          : [],
    });

    const target = await service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP });

    expect(target).to.include({ platformUserId: '15551234567' });
    const [described] = await service.describeInviteChannels(params);
    expect(described).to.include({ via: HumanChannelViaEnum.WHATSAPP, connected: true });
  });

  it('counts a moved number as connected when its new owner proved it, not when the endpoint was made', async () => {
    const { service, channelEndpointRepository } = setup(true);
    channelEndpointRepository.findOne.callsFake(async (query: { integrationIdentifier: string }) =>
      query.integrationIdentifier === 'whatsapp-main'
        ? {
            type: ENDPOINT_TYPES.PHONE,
            providerId: ChatProviderIdEnum.WhatsAppBusiness,
            endpoint: { phoneNumber: '+15551234567', provedAt: '2026-11-05T10:00:00.000Z' },
            createdAt: '2026-10-01T10:00:00.000Z',
          }
        : { type: ENDPOINT_TYPES.TELEGRAM_CHAT, endpoint: { chatId: '42' }, createdAt: '2026-11-01T10:00:00.000Z' }
    );

    // No default saved: the app connected first wins, and Telegram came before the WhatsApp proof.
    const target = await service.resolveChannel(params);

    expect(target).to.include({ platform: HumanChannelViaEnum.TELEGRAM, platformUserId: '42' });
  });

  it('does not reach a number written on the WhatsApp integration without a code', async () => {
    const { service, channelEndpointRepository } = setup(true);
    channelEndpointRepository.findOne.callsFake(async (query: { integrationIdentifier: string }) =>
      query.integrationIdentifier === 'whatsapp-main'
        ? {
            type: ENDPOINT_TYPES.PHONE,
            providerId: ChatProviderIdEnum.WhatsAppBusiness,
            endpoint: { phoneNumber: '+15551234567' },
            createdAt: '2026-11-01T10:00:00.000Z',
          }
        : null
    );

    const error = await service
      .resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP })
      .catch((err: unknown) => err);

    expect(error).to.be.instanceOf(NotFoundException);
  });

  it('does not treat a notification phone endpoint as a WhatsApp binding', async () => {
    const { service, channelEndpointRepository } = setup(true);
    channelEndpointRepository.findOne.callsFake(async (query: { integrationIdentifier: string }) =>
      query.integrationIdentifier === 'whatsapp-main'
        ? {
            type: ENDPOINT_TYPES.PHONE,
            providerId: 'twilio',
            endpoint: { phoneNumber: '+15551234567' },
            createdAt: '2026-11-01T10:00:00.000Z',
          }
        : null
    );

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.contain('has no linked whatsapp endpoint');
    }
  });

  it('offers WhatsApp on the invite page when the flag is on', async () => {
    const { service } = setup(true);

    const channels = await service.listInviteChannels(params);

    expect(channels.map(({ via }) => via)).to.deep.equal([HumanChannelViaEnum.WHATSAPP, HumanChannelViaEnum.TELEGRAM]);
  });

  it('leaves WhatsApp out of the invite page when the flag is off', async () => {
    const { service } = setup(false);

    const channels = await service.listInviteChannels(params);

    expect(channels.map(({ via }) => via)).to.deep.equal([HumanChannelViaEnum.TELEGRAM]);
  });

  it('cannot resolve WhatsApp when the flag is off, as if it were never linked', async () => {
    const { service } = setup(false);

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.WHATSAPP });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.contain('No whatsapp channel is linked to this agent');
    }
  });

  it('does not read the flag when no WhatsApp integration is linked', async () => {
    const { service, getFlag } = setup(false, [telegram]);

    await service.listInviteChannels(params);

    expect(getFlag.called).to.equal(false);
  });
});

describe('pickDefaultTarget with WhatsApp', () => {
  const telegram: ReachableHumanTarget = {
    via: HumanChannelViaEnum.TELEGRAM,
    platform: 'telegram',
    platformUserId: '111',
    integrationIdentifier: 'telegram-main',
    connectedAt: '2026-09-02T10:00:00.000Z',
  };
  const whatsApp: ReachableHumanTarget = {
    via: HumanChannelViaEnum.WHATSAPP,
    platform: 'whatsapp',
    platformUserId: '+15551234567',
    integrationIdentifier: 'whatsapp-main',
    connectedAt: '2026-09-01T10:00:00.000Z',
  };
  const email: ReachableHumanTarget = {
    via: HumanChannelViaEnum.EMAIL,
    platform: 'email',
    platformUserId: 'alice@example.com',
    integrationIdentifier: 'email-main',
    connectedAt: '2026-08-01T10:00:00.000Z',
  };

  it('treats WhatsApp as an ordinary chat app: connected first wins', () => {
    expect(pickDefaultTarget([telegram, whatsApp])).to.equal(whatsApp);
    expect(pickDefaultTarget([telegram, { ...whatsApp, connectedAt: '2026-09-03T10:00:00.000Z' }])?.via).to.equal(
      HumanChannelViaEnum.TELEGRAM
    );
  });

  it('keeps email after WhatsApp even when email was verified first', () => {
    expect(pickDefaultTarget([email, whatsApp])).to.equal(whatsApp);
  });
});
