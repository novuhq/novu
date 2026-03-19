import { Novu } from '@novu/api';
import { CreateWebhookEndpointDto } from '@novu/api/models/components';
import { ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

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
});
