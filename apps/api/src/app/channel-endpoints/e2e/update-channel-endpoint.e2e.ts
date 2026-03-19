import { Novu } from '@novu/api';
import {
  CreateSlackChannelEndpointDto,
  CreateWebhookEndpointDto,
  UpdateChannelEndpointRequestDto,
} from '@novu/api/models/components';
import { ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

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
});
