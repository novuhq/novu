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
import { HumanDeliveryService, pickDefaultTarget, type ReachableHumanTarget } from './human-delivery.service';

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
      channelEndpointRepository as never,
      integrationRepository as never,
      humanContactRepository as never,
      outboundGateway as never,
      keylessEmailGate as never
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
        'Human "alice" has no verified email address. Run `human contact invite alice --via email`.'
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
      expect((err as NotFoundException).message).to.include('awaiting verification');
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
      channelEndpointRepository as never,
      integrationRepository as never,
      humanContactRepository as never,
      { sendDirectMessage: sinon.stub() } as never,
      keylessEmailGate as never
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
      emailGate() as never
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
      channelEndpointRepository as never,
      integrationRepository as never,
      {} as never,
      {} as never,
      emailGate() as never
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

  it('uses the saved default even when it is email', () => {
    expect(pickDefaultTarget([email, telegram], HumanChannelViaEnum.EMAIL)).to.equal(email);
  });

  it('returns undefined when the human is not reachable', () => {
    expect(pickDefaultTarget([])).to.equal(undefined);
  });
});
