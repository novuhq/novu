import { Novu } from '@novu/api';
import {
  CreateSlackChannelEndpointDto,
  CreateTelegramChatEndpointDto,
  CreateWebexPersonEndpointDto,
  CreateWebexRoomEndpointDto,
  CreateWebhookEndpointDto,
} from '@novu/api/models/components';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES, ToolProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createConnection,
  createSlackIntegration,
  createSubscribersService,
  createWebexIntegration,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';
import { expectSdkExceptionGeneric, expectSdkZodError } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const integrationRepository = new IntegrationRepository();
const PAGERDUTY_ROUTING_KEY = 'R0UTINGK3YEXAMPLE0000000000000000';

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

async function createLineIntegration(session: UserSession) {
  return integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ChatProviderIdEnum.Line,
    channel: ChannelTypeEnum.CHAT,
    credentials: { apiToken: 'test-line-channel-access-token' },
    active: true,
    identifier: `line-${Date.now()}`,
  });
}

async function createPagerDutyIntegration(session: UserSession) {
  return integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ToolProviderIdEnum.PagerDuty,
    channel: ChannelTypeEnum.TOOL,
    credentials: {},
    active: true,
    identifier: `pagerduty-${Date.now()}`,
  });
}

describe('Create Channel Endpoint - /channel-endpoints (POST) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should create Slack channel endpoint with connection', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();
    const connection = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);

    const createDto: CreateSlackChannelEndpointDto = {
      integrationIdentifier: integration.identifier,
      connectionIdentifier: connection.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.SLACK_CHANNEL,
      endpoint: {
        channelId: 'C123456789',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.identifier).to.be.a('string');
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.connectionIdentifier).to.equal(connection.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.type).to.equal(ENDPOINT_TYPES.SLACK_CHANNEL);
    expect((result.endpoint as { channelId: string }).channelId).to.equal('C123456789');
  });

  it('should create webhook endpoint without connection', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateWebhookEndpointDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://example.com/webhook',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.type).to.equal(ENDPOINT_TYPES.WEBHOOK);
    expect((result.endpoint as { url: string }).url).to.equal('https://example.com/webhook');
    expect(result.connectionIdentifier).to.be.null;
  });

  it('should create endpoint with context', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateWebhookEndpointDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      context: {
        tenant: 'acme-corp',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://acme.com/webhook',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.contextKeys).to.be.an('array').that.is.not.empty;
    expect(result.contextKeys.some((key) => key.startsWith('tenant:'))).to.be.true;
  });

  it('should create endpoint with custom identifier', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const customIdentifier = 'custom-endpoint-123';

    const createDto: CreateWebhookEndpointDto = {
      identifier: customIdentifier,
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://example.com/webhook',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.identifier).to.equal(customIdentifier);
  });

  it('should fail when integration does not exist', async () => {
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateWebhookEndpointDto = {
      integrationIdentifier: 'non-existent-integration',
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://example.com/webhook',
      },
    };

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelEndpoints.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should fail with 404 when the subscriber does not exist and createSubscriberIfMissing is not set', async () => {
    const integration = await createSlackIntegration(session);

    // Raw HTTP: the regenerated SDK types are not required for this flag test.
    const res = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: 'ghost-subscriber-404',
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: { url: 'https://example.com/webhook' },
    });

    expect(res.status).to.equal(404);
    expect(res.body.message).to.include('Subscriber not found: ghost-subscriber-404');
    expect(res.body.message).to.include('createSubscriberIfMissing');
  });

  it('should create the subscriber on the fly when createSubscriberIfMissing is true', async () => {
    const integration = await createSlackIntegration(session);
    const subscriberId = `jit-subscriber-${Date.now()}`;

    const res = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId,
      createSubscriberIfMissing: true,
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: { url: 'https://example.com/webhook' },
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.subscriberId).to.equal(subscriberId);

    const subscriberRes = await session.testAgent.get(`/v1/subscribers/${subscriberId}`);
    expect(subscriberRes.status).to.equal(200);
    expect(subscriberRes.body.data.subscriberId).to.equal(subscriberId);
  });

  it('should not modify an existing subscriber when createSubscriberIfMissing is true', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber({ firstName: 'Original' });

    const res = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      createSubscriberIfMissing: true,
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: { url: 'https://example.com/webhook' },
    });

    expect(res.status).to.equal(201);

    const subscriberRes = await session.testAgent.get(`/v1/subscribers/${subscriber.subscriberId}`);
    expect(subscriberRes.status).to.equal(200);
    expect(subscriberRes.body.data.firstName).to.equal('Original');
  });

  it('should fail when subscriberId is missing', async () => {
    const integration = await createSlackIntegration(session);

    const createDto = {
      integrationIdentifier: integration.identifier,
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://example.com/webhook',
      },
    } as any;

    const { error } = await expectSdkZodError(() => novuClient.channelEndpoints.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('SDKValidationError');
  });

  it('should fail when connection does not exist', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateSlackChannelEndpointDto = {
      integrationIdentifier: integration.identifier,
      connectionIdentifier: 'non-existent-connection',
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.SLACK_CHANNEL,
      endpoint: {
        channelId: 'C123456789',
      },
    };

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelEndpoints.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should create Webex room endpoint with connection', async () => {
    const integration = await createWebexIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();
    const connection = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);

    const createDto: CreateWebexRoomEndpointDto = {
      integrationIdentifier: integration.identifier,
      connectionIdentifier: connection.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.WEBEX_ROOM,
      endpoint: {
        roomId: 'Y2lzY29zcGFyazovL3VzL1JPT00vMTIz',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.identifier).to.be.a('string');
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.connectionIdentifier).to.equal(connection.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.type).to.equal(ENDPOINT_TYPES.WEBEX_ROOM);
    expect((result.endpoint as { roomId: string }).roomId).to.equal('Y2lzY29zcGFyazovL3VzL1JPT00vMTIz');
  });

  it('should create Webex person endpoint with connection', async () => {
    const integration = await createWebexIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();
    const connection = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);

    const createDto: CreateWebexPersonEndpointDto = {
      integrationIdentifier: integration.identifier,
      connectionIdentifier: connection.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.WEBEX_PERSON,
      endpoint: {
        personEmail: 'user@example.com',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.identifier).to.be.a('string');
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.connectionIdentifier).to.equal(connection.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.type).to.equal(ENDPOINT_TYPES.WEBEX_PERSON);
    expect((result.endpoint as { personEmail: string }).personEmail).to.equal('user@example.com');
  });

  it('should fail when Webex endpoint omits connectionIdentifier', async () => {
    const integration = await createWebexIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.WEBEX_ROOM,
      endpoint: {
        roomId: 'Y2lzY29zcGFyazovL3VzL1JPT00vMTIz',
      },
    } as any;

    const { error } = await expectSdkZodError(() => novuClient.channelEndpoints.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('SDKValidationError');
  });

  it('should fail when creating a Webex endpoint for a non-Webex integration', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();
    const connection = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);

    const createDto: CreateWebexRoomEndpointDto = {
      integrationIdentifier: integration.identifier,
      connectionIdentifier: connection.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.WEBEX_ROOM,
      endpoint: {
        roomId: 'Y2lzY29zcGFyazovL3VzL1JPT00vMTIz',
      },
    };

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelEndpoints.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should fail when Webex endpoint context differs from the channel connection context', async () => {
    const integration = await createWebexIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();
    const connection = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);

    const createDto: CreateWebexRoomEndpointDto = {
      integrationIdentifier: integration.identifier,
      connectionIdentifier: connection.identifier,
      subscriberId: subscriber.subscriberId,
      context: {
        tenant: 'acme-corp',
      },
      type: ENDPOINT_TYPES.WEBEX_ROOM,
      endpoint: {
        roomId: 'Y2lzY29zcGFyazovL3VzL1JPT00vMTIz',
      },
    };

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelEndpoints.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should create a telegram_chat endpoint with the supplied chatId', async () => {
    const integration = await createTelegramIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateTelegramChatEndpointDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: {
        chatId: '987654321',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.identifier).to.be.a('string');
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.type).to.equal(ENDPOINT_TYPES.TELEGRAM_CHAT);
    expect((result.endpoint as { chatId: string }).chatId).to.equal('987654321');
    expect(result.connectionIdentifier).to.be.null;
  });

  it('should create a line_user endpoint with the supplied userId', async () => {
    const integration = await createLineIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.LINE_USER,
      endpoint: {
        userId: 'U1234567890abcdef',
      },
    };

    const { result } = await novuClient.channelEndpoints.create(createDto);

    expect(result.identifier).to.be.a('string');
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.type).to.equal(ENDPOINT_TYPES.LINE_USER);
    expect((result.endpoint as { userId: string }).userId).to.equal('U1234567890abcdef');
    expect(result.connectionIdentifier).to.be.null;
  });

  it('should create a pagerduty_service endpoint for a PagerDuty integration', async () => {
    const integration = await createPagerDutyIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    // Raw HTTP: SDK may not yet include CreatePagerDutyServiceEndpointDto.
    const res = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.PAGERDUTY_SERVICE,
      endpoint: {
        routingKey: PAGERDUTY_ROUTING_KEY,
        region: 'us',
      },
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.type).to.equal(ENDPOINT_TYPES.PAGERDUTY_SERVICE);
    expect(res.body.data.subscriberId).to.equal(subscriber.subscriberId);
    expect(res.body.data.endpoint.routingKey).to.equal(PAGERDUTY_ROUTING_KEY);
    expect(res.body.data.endpoint.region).to.equal('us');
    expect(res.body.data.connectionIdentifier).to.be.a('string');
  });

  it('should fail when creating a pagerduty_service endpoint for a non-PagerDuty integration', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const res = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.PAGERDUTY_SERVICE,
      endpoint: {
        routingKey: PAGERDUTY_ROUTING_KEY,
        region: 'us',
      },
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('requires a PagerDuty integration');
  });
});
