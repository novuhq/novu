import { Novu } from '@novu/api';
import { CreateTelegramChatEndpointDto } from '@novu/api/models/components';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createConnection,
  createSlackChannelEndpoint,
  createSlackIntegration,
  createSubscribersService,
  createWebhookEndpoint,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';

const integrationRepository = new IntegrationRepository();

async function createTelegramIntegration(session: UserSession) {
  return integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ChatProviderIdEnum.Telegram,
    channel: ChannelTypeEnum.CHAT,
    credentials: {},
    active: true,
    identifier: `telegram-${Date.now()}`,
  });
}

describe('List Channel Endpoints - /channel-endpoints (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should list all channel endpoints', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber1 = await subscribersService.createSubscriber();
    const subscriber2 = await subscribersService.createSubscriber();

    await createWebhookEndpoint(novuClient, integration.identifier, subscriber1.subscriberId);
    await createWebhookEndpoint(novuClient, integration.identifier, subscriber2.subscriberId);

    const { result } = await novuClient.channelEndpoints.list({});

    expect(result.data).to.be.an('array');
    expect(result.data.length).to.be.at.least(2);
    expect(result.totalCount).to.be.at.least(2);
  });

  it('should filter by subscriberId, connectionIdentifier, and contextKeys', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();
    const connection = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);

    await createSlackChannelEndpoint(
      novuClient,
      integration.identifier,
      subscriber.subscriberId,
      connection.identifier
    );
    const endpointWithContext = await createWebhookEndpoint(
      novuClient,
      integration.identifier,
      subscriber.subscriberId,
      {
        tenant: 'acme',
      }
    );

    const { result: subscriberResult } = await novuClient.channelEndpoints.list({
      subscriberId: subscriber.subscriberId,
    });

    expect(subscriberResult.data.length).to.be.at.least(2);
    expect(subscriberResult.data.every((ep) => ep.subscriberId === subscriber.subscriberId)).to.be.true;

    const { result: connectionResult } = await novuClient.channelEndpoints.list({
      connectionIdentifier: connection.identifier,
    });

    expect(connectionResult.data.length).to.be.at.least(1);
    expect(connectionResult.data[0].connectionIdentifier).to.equal(connection.identifier);

    const { result: contextResult } = await novuClient.channelEndpoints.list({
      contextKeys: endpointWithContext.contextKeys,
    });

    expect(contextResult.data.length).to.be.at.least(1);
    expect(contextResult.data.some((ep) => ep.identifier === endpointWithContext.identifier)).to.be.true;
  });

  it('should filter by providerId including telegram', async () => {
    const integration = await createTelegramIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateTelegramChatEndpointDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: {
        chatId: '123456789',
      },
    };

    const { result: created } = await novuClient.channelEndpoints.create(createDto);

    const { result: telegramResult } = await novuClient.channelEndpoints.list({
      subscriberId: subscriber.subscriberId,
      integrationIdentifier: integration.identifier,
      providerId: ChatProviderIdEnum.Telegram,
      limit: 1,
    });

    expect(telegramResult.data.length).to.equal(1);
    expect(telegramResult.data[0].identifier).to.equal(created.identifier);
    expect(telegramResult.data[0].providerId).to.equal(ChatProviderIdEnum.Telegram);
  });

  it('should support pagination', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);

    for (let i = 0; i < 5; i++) {
      const subscriber = await subscribersService.createSubscriber();
      await createWebhookEndpoint(novuClient, integration.identifier, subscriber.subscriberId);
    }

    const { result: firstPage } = await novuClient.channelEndpoints.list({
      limit: 3,
    });

    expect(firstPage.data.length).to.equal(3);
    expect(firstPage.totalCount).to.be.at.least(5);

    if (firstPage.next) {
      const { result: secondPage } = await novuClient.channelEndpoints.list({
        limit: 3,
        after: firstPage.next,
      });

      expect(secondPage.data.length).to.be.at.least(1);
    }
  });

  it('should return empty list when no endpoints exist', async () => {
    const { result } = await novuClient.channelEndpoints.list({});

    expect(result.data).to.be.an('array');
    expect(result.totalCount).to.equal(0);
  });
});
