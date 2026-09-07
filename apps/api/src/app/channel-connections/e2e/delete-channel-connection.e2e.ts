import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import {
  createConnection,
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from './helpers/channel-helpers';

describe('Delete Channel Connection - /channel-connections/:identifier (DELETE) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should delete channel connection successfully', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const created = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);
    const identifier = created.identifier;

    await novuClient.channelConnections.delete(identifier);

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelConnections.retrieve(identifier));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should return 404 when connection does not exist', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.channelConnections.delete('non-existent-identifier')
    );

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });
});
