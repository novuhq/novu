import { Novu } from '@novu/api';
import {
  CreateSlackChannelEndpointDto,
  CreateWebhookEndpointDto,
  UpdateChannelEndpointRequestDto,
} from '@novu/api/models/components';
import { ChannelConnectionRepository } from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { createOpsgenieIntegration, VALID_OPSGENIE_API_KEY } from './helpers/opsgenie-helpers';
import { createToolWebhookIntegration, VALID_TOOL_WEBHOOK_URL } from './helpers/tool-webhook-helpers';

const channelConnectionRepository = new ChannelConnectionRepository();

describe('Update Channel Endpoint - /channel-endpoints/:identifier (PATCH) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should update channel endpoint data', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateSlackChannelEndpointDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.SLACK_CHANNEL,
      endpoint: {
        channelId: 'C123456789',
      },
    };

    const { result: created } = await novuClient.channelEndpoints.create(createDto);
    const identifier = created.identifier;

    const updateDto: UpdateChannelEndpointRequestDto = {
      endpoint: {
        channelId: 'C987654321',
      },
    };

    const { result } = await novuClient.channelEndpoints.update(updateDto, identifier);

    expect(result.identifier).to.equal(identifier);
    expect((result.endpoint as { channelId: string }).channelId).to.equal('C987654321');
  });

  it('should update webhook endpoint URL', async () => {
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

    const { result: created } = await novuClient.channelEndpoints.create(createDto);
    const identifier = created.identifier;

    const updateDto: UpdateChannelEndpointRequestDto = {
      endpoint: {
        url: 'https://updated.com/webhook',
      },
    };

    const { result } = await novuClient.channelEndpoints.update(updateDto, identifier);

    expect((result.endpoint as { url: string }).url).to.equal('https://updated.com/webhook');
  });

  it('should return 404 when endpoint does not exist', async () => {
    const updateDto: UpdateChannelEndpointRequestDto = {
      endpoint: {
        channelId: 'C999999999',
      },
    };

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.channelEndpoints.update(updateDto, 'non-existent-identifier')
    );

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should rotate the opsgenie apiKey and region on the linked connection', async () => {
    const integration = await createOpsgenieIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const initialApiKey = VALID_OPSGENIE_API_KEY;
    const rotatedApiKey = 'f9e8d7c6-b5a4-4321-9876-543210fedcba';

    const createRes = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
      endpoint: { apiKey: initialApiKey, region: 'us' },
    });
    expect(createRes.status).to.equal(201);

    const updateRes = await session.testAgent
      .patch(`/v1/channel-endpoints/${createRes.body.data.identifier}`)
      .send({ endpoint: { apiKey: rotatedApiKey, region: 'eu' } });

    expect(updateRes.status).to.equal(200);
    expect(updateRes.body.data.endpoint.apiKey).to.equal(rotatedApiKey);
    expect(updateRes.body.data.endpoint.region).to.equal('eu');

    // The rotated secret is re-encrypted on the linked connection.
    const connection = await channelConnectionRepository.findOne({
      identifier: createRes.body.data.connectionIdentifier,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    const storedApiKey = (connection?.auth as { apiKey?: string })?.apiKey;
    expect(storedApiKey).to.be.a('string');
    expect(storedApiKey).to.not.equal(rotatedApiKey);
    expect(storedApiKey?.startsWith('nvsk.')).to.be.true;
    expect((connection?.auth as { region?: string })?.region).to.equal('eu');

    // A follow-up GET returns the rotated wire shape.
    const getRes = await session.testAgent.get(`/v1/channel-endpoints/${createRes.body.data.identifier}`);
    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.endpoint.apiKey).to.equal(rotatedApiKey);
    expect(getRes.body.data.endpoint.region).to.equal('eu');
  });

  it('should reject an opsgenie rotation with an invalid apiKey format', async () => {
    const integration = await createOpsgenieIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createRes = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
      endpoint: { apiKey: VALID_OPSGENIE_API_KEY, region: 'us' },
    });
    expect(createRes.status).to.equal(201);

    const updateRes = await session.testAgent
      .patch(`/v1/channel-endpoints/${createRes.body.data.identifier}`)
      .send({ endpoint: { apiKey: 'not-a-uuid', region: 'us' } });

    expect(updateRes.status).to.equal(400);
  });

  it('should rotate the tool_webhook url/headers/method on the linked connection', async () => {
    const integration = await createToolWebhookIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const rotatedUrl = 'https://example.com/tools/rotated';

    const createRes = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.TOOL_WEBHOOK,
      endpoint: { url: VALID_TOOL_WEBHOOK_URL },
    });
    expect(createRes.status).to.equal(201);

    const updateRes = await session.testAgent
      .patch(`/v1/channel-endpoints/${createRes.body.data.identifier}`)
      .send({ endpoint: { url: rotatedUrl, headers: { Authorization: 'Bearer rotated-token' }, method: 'PUT' } });

    expect(updateRes.status).to.equal(200);
    expect(updateRes.body.data.endpoint.url).to.equal(rotatedUrl);
    expect(updateRes.body.data.endpoint.headers).to.deep.equal({ Authorization: 'Bearer rotated-token' });
    expect(updateRes.body.data.endpoint.method).to.equal('PUT');

    // The rotated secret is re-encrypted on the linked connection.
    const connection = await channelConnectionRepository.findOne({
      identifier: createRes.body.data.connectionIdentifier,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    const storedUrl = (connection?.auth as { url?: string })?.url;
    expect(storedUrl).to.be.a('string');
    expect(storedUrl).to.not.equal(rotatedUrl);
    expect(storedUrl?.startsWith('nvsk.')).to.be.true;

    // A follow-up GET returns the rotated wire shape.
    const getRes = await session.testAgent.get(`/v1/channel-endpoints/${createRes.body.data.identifier}`);
    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.endpoint.url).to.equal(rotatedUrl);
    expect(getRes.body.data.endpoint.method).to.equal('PUT');
  });

  it('should reject a tool_webhook rotation with a malformed url', async () => {
    const integration = await createToolWebhookIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createRes = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.TOOL_WEBHOOK,
      endpoint: { url: VALID_TOOL_WEBHOOK_URL },
    });
    expect(createRes.status).to.equal(201);

    const updateRes = await session.testAgent
      .patch(`/v1/channel-endpoints/${createRes.body.data.identifier}`)
      .send({ endpoint: { url: 'not-a-valid-url' } });

    expect(updateRes.status).to.equal(400);
  });
});
