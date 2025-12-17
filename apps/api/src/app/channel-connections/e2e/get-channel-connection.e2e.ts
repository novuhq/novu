import { Novu } from '@novu/api';
import { CreateChannelConnectionRequestDto } from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { createSlackIntegration, createSubscribersService, setupChannelTests } from './helpers/channel-helpers';

describe('Get Channel Connection - /channel-connections/:identifier (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should get channel connection by identifier', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateChannelConnectionRequestDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: {
        id: 'T123456',
        name: 'Test Workspace',
      },
      auth: {
        accessToken: 'xoxb-test-token',
      },
    };

    const { result: created } = await novuClient.channelConnections.create(createDto);
    const identifier = created.identifier;

    const { result } = await novuClient.channelConnections.retrieve(identifier);

    expect(result.identifier).to.equal(identifier);
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.workspace.id).to.equal('T123456');
    expect(result.auth.accessToken).to.equal('xoxb-test-token');
  });

  it('should return 404 when connection does not exist', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.channelConnections.retrieve('non-existent-identifier')
    );

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });
});
