import { Novu } from '@novu/api';
import { UpdateChannelConnectionRequestDto } from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import {
  createConnection,
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from './helpers/channel-helpers';

describe('Update Channel Connection - /channel-connections/:identifier (PATCH) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should update channel connection workspace and auth', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const created = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);
    const identifier = created.identifier;

    const updateDto: UpdateChannelConnectionRequestDto = {
      workspace: {
        id: 'T789012',
        name: 'Updated Workspace',
      },
      auth: {
        accessToken: 'xoxb-updated-token',
      },
    };

    const { result } = await novuClient.channelConnections.update(updateDto, identifier);

    expect(result.identifier).to.equal(identifier);
    expect(result.workspace.id).to.equal('T789012');
    expect(result.workspace.name).to.equal('Updated Workspace');
    expect(result.auth.accessToken).to.equal('xoxb-updated-token');
  });

  it('should return 404 when connection does not exist', async () => {
    const updateDto: UpdateChannelConnectionRequestDto = {
      workspace: {
        id: 'T999999',
      },
      auth: {
        accessToken: 'xoxb-token',
      },
    };

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.channelConnections.update(updateDto, 'non-existent-identifier')
    );

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });
});
