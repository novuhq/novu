import { Novu } from '@novu/api';
import { CreateSlackChannelEndpointDto, CreateWebhookEndpointDto } from '@novu/api/models/components';
import { ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createConnection,
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';
import { expectSdkExceptionGeneric, expectSdkZodError } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

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
});
