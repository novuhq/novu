import { Novu } from '@novu/api';
import { CreateWebhookEndpointDto } from '@novu/api/models/components';
import { ChannelConnectionRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ENDPOINT_TYPES, ToolProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const integrationRepository = new IntegrationRepository();
const channelConnectionRepository = new ChannelConnectionRepository();

async function createOpsgenieIntegration(session: UserSession) {
  return integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ToolProviderIdEnum.Opsgenie,
    channel: ChannelTypeEnum.TOOL,
    credentials: {},
    active: true,
    identifier: `opsgenie-${Date.now()}`,
  });
}

describe('Delete Channel Endpoint - /channel-endpoints/:identifier (DELETE) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should delete channel endpoint successfully', async () => {
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

    await novuClient.channelEndpoints.delete(identifier);

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelEndpoints.retrieve(identifier));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should return 404 when endpoint does not exist', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.channelEndpoints.delete('non-existent-identifier')
    );

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should cascade-delete the linked connection when deleting an opsgenie endpoint', async () => {
    const integration = await createOpsgenieIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createRes = await session.testAgent.post('/v1/channel-endpoints').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
      endpoint: { apiKey: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', region: 'us' },
    });
    expect(createRes.status).to.equal(201);
    const { identifier, connectionIdentifier } = createRes.body.data;

    const deleteRes = await session.testAgent.delete(`/v1/channel-endpoints/${identifier}`);
    expect(deleteRes.status).to.equal(204);

    const connection = await channelConnectionRepository.findOne({
      identifier: connectionIdentifier,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    expect(connection).to.not.exist;
  });
});
