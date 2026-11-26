import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  createConnection,
  createSlackIntegration,
  createSubscribersService,
  setupChannelTests,
} from './helpers/channel-helpers';

describe('List Channel Connections - /channel-connections (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should list all channel connections', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber1 = await subscribersService.createSubscriber();
    const subscriber2 = await subscribersService.createSubscriber();

    await createConnection(novuClient, integration.identifier, subscriber1.subscriberId);
    await createConnection(novuClient, integration.identifier, subscriber2.subscriberId);

    const { result } = await novuClient.channelConnections.list({});

    expect(result.data).to.be.an('array');
    expect(result.data.length).to.be.at.least(2);
    expect(result.totalCount).to.be.at.least(2);
  });

  it('should filter by subscriberId, integrationIdentifier, and contextKeys', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    await createConnection(novuClient, integration.identifier, subscriber.subscriberId);
    const connectionWithContext = await createConnection(novuClient, integration.identifier, undefined, {
      tenant: 'acme',
    });

    const { result: subscriberResult } = await novuClient.channelConnections.list({
      subscriberId: subscriber.subscriberId,
    });

    expect(subscriberResult.data.length).to.equal(1);
    expect(subscriberResult.data[0].subscriberId).to.equal(subscriber.subscriberId);

    const { result: integrationResult } = await novuClient.channelConnections.list({
      integrationIdentifier: integration.identifier,
    });

    expect(integrationResult.data.length).to.be.at.least(2);

    const { result: contextResult } = await novuClient.channelConnections.list({
      contextKeys: connectionWithContext.contextKeys,
    });

    expect(contextResult.data.length).to.be.at.least(1);
    expect(contextResult.data.some((conn) => conn.identifier === connectionWithContext.identifier)).to.be.true;
  });

  it('should list only subscriber connections when connectionMode is subscriber', async () => {
    const integration = await createSlackIntegration(session);
    const subscriber = await createSubscribersService(session).createSubscriber();

    const subscriberConnection = await createConnection(novuClient, integration.identifier, subscriber.subscriberId);
    await createConnection(novuClient, integration.identifier, undefined, { tenant: 'acme' });

    const { body } = await session.testAgent
      .get('/v1/channel-connections')
      .query({ integrationIdentifier: integration.identifier, connectionMode: 'subscriber' })
      .expect(200);

    expect(body.data.map((conn: { identifier: string }) => conn.identifier)).to.deep.equal([
      subscriberConnection.identifier,
    ]);
    expect(body.totalCount).to.equal(1);
  });

  it('should list only shared connections when connectionMode is shared', async () => {
    const integration = await createSlackIntegration(session);
    const subscriber = await createSubscribersService(session).createSubscriber();

    await createConnection(novuClient, integration.identifier, subscriber.subscriberId);
    const sharedConnection = await createConnection(novuClient, integration.identifier, undefined, {
      tenant: 'acme',
    });

    const { body } = await session.testAgent
      .get('/v1/channel-connections')
      .query({ integrationIdentifier: integration.identifier, connectionMode: 'shared' })
      .expect(200);

    expect(body.data.map((conn: { identifier: string }) => conn.identifier)).to.deep.equal([
      sharedConnection.identifier,
    ]);
    expect(body.totalCount).to.equal(1);
  });

  it('should support pagination', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);

    for (let i = 0; i < 5; i++) {
      const subscriber = await subscribersService.createSubscriber();
      await createConnection(novuClient, integration.identifier, subscriber.subscriberId);
    }

    const { result: firstPage } = await novuClient.channelConnections.list({
      limit: 3,
    });

    expect(firstPage.data.length).to.equal(3);
    expect(firstPage.totalCount).to.be.at.least(5);

    if (firstPage.next) {
      const { result: secondPage } = await novuClient.channelConnections.list({
        limit: 3,
        after: firstPage.next,
      });

      expect(secondPage.data.length).to.be.at.least(1);
    }
  });

  it('should return empty list when no connections exist', async () => {
    const { result } = await novuClient.channelConnections.list({});

    expect(result.data).to.be.an('array');
    expect(result.totalCount).to.equal(0);
  });
});
