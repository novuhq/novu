import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanDeliveryService } from './human-delivery.service';

describe('HumanDeliveryService.resolveChannel', () => {
  function setup() {
    const agentIntegrationRepository = { find: sinon.stub() };
    const channelEndpointRepository = { findOne: sinon.stub().resolves(null) };
    const integrationRepository = { find: sinon.stub() };
    const subscriberRepository = { findOne: sinon.stub().resolves(null) };
    const outboundGateway = { sendDirectMessage: sinon.stub() };
    const service = new HumanDeliveryService(
      agentIntegrationRepository as never,
      channelEndpointRepository as never,
      integrationRepository as never,
      subscriberRepository as never,
      outboundGateway as never
    );

    return {
      service,
      agentIntegrationRepository,
      channelEndpointRepository,
      integrationRepository,
      subscriberRepository,
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

  it('tells the caller to invite on email when the subscriber has no address', async () => {
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
        'Human "alice" has no email address on file. Run `human invite alice --via email`.'
      );
    }
  });

  it('still asks for via when the human is reachable on several channels', async () => {
    const { service, agentIntegrationRepository, channelEndpointRepository, integrationRepository } = setup();
    agentIntegrationRepository.find.resolves([{ _integrationId: 'int1' }, { _integrationId: 'int2' }]);
    integrationRepository.find.resolves([
      {
        _id: 'int1',
        identifier: 'telegram-main',
        providerId: ChatProviderIdEnum.Telegram,
        channel: ChannelTypeEnum.CHAT,
      },
      {
        _id: 'int2',
        identifier: 'slack-main',
        providerId: ChatProviderIdEnum.Slack,
        channel: ChannelTypeEnum.CHAT,
      },
    ]);
    channelEndpointRepository.findOne.onFirstCall().resolves({
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: '111' },
    });
    channelEndpointRepository.findOne.onSecondCall().resolves({
      type: ENDPOINT_TYPES.SLACK_USER,
      endpoint: { userId: 'U1' },
    });

    try {
      await service.resolveChannel(params);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
      expect((err as BadRequestException).message).to.include('Pass `via`');
    }
  });
});
