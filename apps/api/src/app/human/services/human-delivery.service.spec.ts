import { ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  ENDPOINT_TYPES,
  HumanAddressVerificationStateEnum,
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE } from '../../keyless/keyless-email-gate.service';
import { KEYLESS_VOICE_REQUIRES_ACCOUNT_CODE } from '../../keyless/keyless-voice-gate.service';
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

function voiceFlag(enabled = true) {
  return { getFlag: sinon.stub().resolves(enabled) };
}

function unusedPlaceVoiceCall() {
  return { execute: sinon.stub() };
}

function voiceGate(blocked = false) {
  return {
    isBlocked: sinon.stub().returns(blocked),
    assertAllowed: blocked
      ? sinon.stub().rejects(new HttpException({ code: KEYLESS_VOICE_REQUIRES_ACCOUNT_CODE }, 403))
      : sinon.stub().resolves(),
  };
}

describe('HumanDeliveryService.resolveChannel', () => {
  function setup(options: { voiceEnabled?: boolean; voiceBlocked?: boolean } = {}) {
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
      keylessEmailGate as never,
      voiceFlag(options.voiceEnabled ?? true) as never,
      voiceGate(options.voiceBlocked ?? false) as never,
      unusedPlaceVoiceCall() as never
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

  it('resolves a verified phone number when via is voice', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'voice1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'voice1',
        identifier: 'voice-main',
        providerId: ChatProviderIdEnum.AgentVoiceCall,
        channel: ChannelTypeEnum.CHAT,
        active: true,
      },
    ]);
    humanContactRepository.findVerifiedAddress.resolves({
      address: '+15551212',
      verifiedAt: '2026-01-02T00:00:00.000Z',
    });

    const target = await service.resolveChannel({ ...params, via: HumanChannelViaEnum.VOICE });

    expect(target).to.deep.equal({
      platform: HumanChannelViaEnum.VOICE,
      platformUserId: '+15551212',
      integrationIdentifier: 'voice-main',
    });
  });

  it('404s when the phone number is not verified', async () => {
    const { service, agentIntegrationRepository, integrationRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'voice1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'voice1',
        identifier: 'voice-main',
        providerId: ChatProviderIdEnum.AgentVoiceCall,
        channel: ChannelTypeEnum.CHAT,
        active: true,
      },
    ]);

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.VOICE });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.include('no verified phone number');
    }
  });

  it('rejects an explicit voice send when the flag is off', async () => {
    const { service, agentIntegrationRepository } = setup({ voiceEnabled: false });

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.VOICE });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.equal('Voice is not enabled for this workspace.');
    }

    expect(agentIntegrationRepository.find.called).to.equal(false);
  });

  it('blocks a keyless organization from placing a call', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup({
      voiceBlocked: true,
    });
    agentIntegrationRepository.find.resolves([{ _integrationId: 'voice1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'voice1',
        identifier: 'voice-main',
        providerId: ChatProviderIdEnum.AgentVoiceCall,
        channel: ChannelTypeEnum.CHAT,
        active: true,
      },
    ]);
    humanContactRepository.findVerifiedAddress.resolves({
      address: '+15551212',
      verifiedAt: '2026-01-02T00:00:00.000Z',
    });

    try {
      await service.resolveChannel({ ...params, via: HumanChannelViaEnum.VOICE });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(403);
      expect((err as HttpException).getResponse()).to.include({ code: KEYLESS_VOICE_REQUIRES_ACCOUNT_CODE });
    }
  });

  it('does not auto-pick voice when another channel is also reachable', async () => {
    const {
      service,
      agentIntegrationRepository,
      integrationRepository,
      channelEndpointRepository,
      humanContactRepository,
    } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'voice1' }, { _integrationId: 'tg1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'voice1',
        identifier: 'voice-main',
        providerId: ChatProviderIdEnum.AgentVoiceCall,
        channel: ChannelTypeEnum.CHAT,
        active: true,
      },
      {
        _id: 'tg1',
        identifier: 'telegram-main',
        providerId: ChatProviderIdEnum.Telegram,
        channel: ChannelTypeEnum.CHAT,
        active: true,
      },
    ]);
    channelEndpointRepository.findOne.resolves({
      subscriberId: 'alice',
      integrationIdentifier: 'telegram-main',
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: '111' },
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    humanContactRepository.findVerifiedAddress.resolves({
      address: '+15551212',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    });

    const target = await service.resolveChannel(params);

    expect(target.integrationIdentifier).to.equal('telegram-main');
    expect(target.platform).to.not.equal(HumanChannelViaEnum.VOICE);
  });

  it('uses voice when it is the saved default and the flag is on', async () => {
    const { service, agentIntegrationRepository, integrationRepository, humanContactRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'voice1' }, { _integrationId: 'tg1' }]);
    integrationRepository.find.resolves([
      {
        _id: 'voice1',
        identifier: 'voice-main',
        providerId: ChatProviderIdEnum.AgentVoiceCall,
        channel: ChannelTypeEnum.CHAT,
        active: true,
      },
      {
        _id: 'tg1',
        identifier: 'telegram-main',
        providerId: ChatProviderIdEnum.Telegram,
        channel: ChannelTypeEnum.CHAT,
        active: true,
      },
    ]);
    humanContactRepository.findContact.resolves({ defaultVia: HumanChannelViaEnum.VOICE });
    humanContactRepository.findVerifiedAddress.resolves({
      address: '+15551212',
      verifiedAt: '2026-01-02T00:00:00.000Z',
    });

    const target = await service.resolveChannel(params);

    expect(target).to.deep.equal({
      platform: HumanChannelViaEnum.VOICE,
      platformUserId: '+15551212',
      integrationIdentifier: 'voice-main',
    });
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
      keylessEmailGate as never,
      voiceFlag() as never,
      voiceGate() as never,
      unusedPlaceVoiceCall() as never
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
      voiceFlag() as never,
      voiceGate() as never,
      unusedPlaceVoiceCall() as never
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
      emailGate() as never,
      voiceFlag() as never,
      voiceGate() as never,
      unusedPlaceVoiceCall() as never
    );

    const channels = await service.listWorkingChannels({
      environmentId: 'env1',
      organizationId: 'org1',
      agent: { _id: 'a1', identifier: 'human-relay', name: 'Human' },
    });

    expect(channels).to.deep.equal([HumanChannelViaEnum.TELEGRAM]);
  });
});

describe('HumanDeliveryService.deliver', () => {
  it('stamps the ElevenLabs conversation id and keeps the Twilio call sid', async () => {
    const placeVoiceCall = {
      execute: sinon.stub().resolves({ conversationId: 'conv_1', callSid: 'CA1' }),
    };
    const service = new HumanDeliveryService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      emailGate() as never,
      voiceFlag() as never,
      voiceGate() as never,
      placeVoiceCall as never
    );
    const interaction = {
      identifier: 'hi_1',
      _environmentId: 'env1',
      _organizationId: 'org1',
      kind: HumanInteractionKindEnum.APPROVE,
      content: { cardChrome: { title: 'Approve the deploy?', body: 'Now.' } },
    };

    const sent = await service.deliver(
      interaction as never,
      { platform: HumanChannelViaEnum.VOICE, platformUserId: '+15551212', integrationIdentifier: 'voice-main' },
      'sub-1'
    );

    expect(sent).to.deep.equal({ platformMessageId: 'conv_1', platformThreadId: 'CA1' });
    expect(placeVoiceCall.execute.firstCall.args[0]).to.include({
      interactionId: 'hi_1',
      subscriberId: 'sub-1',
      toNumber: '+15551212',
      openingLine: 'Approve the deploy? Now.',
    });
  });

  it('uses the conversation id as the thread when Twilio does not return a call sid', async () => {
    const placeVoiceCall = { execute: sinon.stub().resolves({ conversationId: 'conv_1' }) };
    const service = new HumanDeliveryService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      emailGate() as never,
      voiceFlag() as never,
      voiceGate() as never,
      placeVoiceCall as never
    );

    const sent = await service.deliver(
      {
        identifier: 'hi_1',
        _environmentId: 'env1',
        _organizationId: 'org1',
        kind: HumanInteractionKindEnum.ASK,
        content: { cardChrome: { title: 'What is the code?' } },
      } as never,
      { platform: HumanChannelViaEnum.VOICE, platformUserId: '+15551212', integrationIdentifier: 'voice-main' },
      'sub-1'
    );

    expect(sent.platformMessageId).to.equal('conv_1');
    expect(sent.platformThreadId).to.equal('conv_1');
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
