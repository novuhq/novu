import { NotFoundException } from '@nestjs/common';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanDeliveryService, pickDefaultTarget, type ReachableHumanTarget } from './human-delivery.service';

describe('HumanDeliveryService.resolveChannel', () => {
  function setup() {
    const agentIntegrationRepository = { find: sinon.stub() };
    const channelEndpointRepository = { findOne: sinon.stub().resolves(null) };
    const integrationRepository = { find: sinon.stub() };
    const humanContactRepository = {
      findContact: sinon.stub().resolves(null),
      findVerifiedAddress: sinon.stub().resolves(null),
      findPendingAddress: sinon.stub().resolves(null),
    };
    const outboundGateway = { sendDirectMessage: sinon.stub() };
    const service = new HumanDeliveryService(
      agentIntegrationRepository as never,
      channelEndpointRepository as never,
      integrationRepository as never,
      humanContactRepository as never,
      outboundGateway as never
    );

    return {
      service,
      agentIntegrationRepository,
      channelEndpointRepository,
      integrationRepository,
      humanContactRepository,
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
      expect((err as NotFoundException).message).to.include('human setup');
      expect((err as NotFoundException).message).to.not.include('human invite');
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
        'Human "alice" has no linked channel. Run `human invite alice`.'
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
        'Human "alice" has no linked telegram endpoint. Run `human invite alice --via telegram`.'
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
        providerId: 'novu-email-agent',
        channel: ChannelTypeEnum.EMAIL,
      },
    ]);

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.EMAIL });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.equal(
        'Human "alice" has no verified email address. Run `human invite alice --via email`.'
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
        providerId: 'novu-email-agent',
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
        providerId: 'novu-email-agent',
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
        providerId: 'novu-email-agent',
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

describe('HumanDeliveryService.listInviteChannels', () => {
  it('offers active Telegram, Slack, and Email integrations, once per app', async () => {
    const agentIntegrationRepository = {
      find: sinon.stub().resolves([1, 2, 3, 4, 5].map((n) => ({ _integrationId: `int${n}` }))),
    };
    const integrationRepository = {
      find: sinon.stub().resolves([
        { identifier: 'email-main', providerId: 'novu-email-agent', channel: ChannelTypeEnum.EMAIL, active: true },
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
