import { Novu } from '@novu/api';
import { CreateSlackChannelEndpointDto } from '@novu/api/models/components';
import { ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from '../../channel-connections/e2e/helpers/channel-helpers';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Channel Endpoint - /channel-endpoints/:identifier (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should get channel endpoint by identifier', async () => {
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

    const { result } = await novuClient.channelEndpoints.retrieve(identifier);

    expect(result.identifier).to.equal(identifier);
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.type).to.equal(ENDPOINT_TYPES.SLACK_CHANNEL);
    expect((result.endpoint as { channelId: string }).channelId).to.equal('C123456789');
  });

  it('should return 404 when endpoint does not exist', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.channelEndpoints.retrieve('non-existent-identifier')
    );

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });
});
