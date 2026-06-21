import { Novu } from '@novu/api';
import { ChannelConnectionRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { createConnection, createSlackIntegration, setupChannelTests } from './helpers/channel-helpers';

const NOVU_ENCRYPTION_PREFIX = 'nvsk.';

describe('Channel Connection auth — at-rest encryption #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const channelConnectionRepository = new ChannelConnectionRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('stores accessToken encrypted with the Novu prefix on create', async () => {
    const integration = await createSlackIntegration(session);
    const cleartextToken = `xoxb-at-rest-create-${Date.now()}`;

    const { result: created } = await novuClient.channelConnections.create({
      integrationIdentifier: integration.identifier,
      context: { tenant: 'at-rest-create' },
      workspace: { id: 'T_at_rest_create' },
      auth: { accessToken: cleartextToken },
    });

    const stored = await channelConnectionRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier: created.identifier,
    });

    expect(stored).to.exist;
    expect(stored?.auth?.accessToken).to.be.a('string');
    expect(stored?.auth?.accessToken).to.not.equal(cleartextToken);
    expect(stored?.auth?.accessToken?.startsWith(NOVU_ENCRYPTION_PREFIX)).to.equal(true);
  });

  it('stores accessToken encrypted with the Novu prefix on update', async () => {
    const integration = await createSlackIntegration(session);
    const created = await createConnection(novuClient, integration.identifier, undefined, { tenant: 'at-rest-patch' });

    const newToken = `xoxb-at-rest-patch-${Date.now()}`;
    await novuClient.channelConnections.update(
      { workspace: { id: 'T_at_rest_patch_new' }, auth: { accessToken: newToken } },
      created.identifier
    );

    const stored = await channelConnectionRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier: created.identifier,
    });

    expect(stored?.auth?.accessToken).to.be.a('string');
    expect(stored?.auth?.accessToken).to.not.equal(newToken);
    expect(stored?.auth?.accessToken?.startsWith(NOVU_ENCRYPTION_PREFIX)).to.equal(true);
  });

  it('never exposes secrets in retrieve response', async () => {
    const integration = await createSlackIntegration(session);
    const cleartextToken = `xoxb-secret-check-${Date.now()}`;

    const { result: created } = await novuClient.channelConnections.create({
      integrationIdentifier: integration.identifier,
      context: { tenant: 'secret-check' },
      workspace: { id: 'T_secret_check' },
      auth: { accessToken: cleartextToken },
    });

    const { body } = await session.testAgent
      .get(`/v1/channel-connections/${created.identifier}`)
      .set('authorization', `ApiKey ${session.apiKey}`);

    const response = body.data;
    const responseJson = JSON.stringify(response);

    expect(responseJson).to.not.include(cleartextToken);
    expect(responseJson).to.not.include('refreshToken');
    expect(responseJson).to.not.include('signingSecret');
    expect(responseJson).to.not.include('clientSecret');

    expect(response.auth.accessToken).to.equal('');
    expect(response.connected).to.equal(true);
    expect(response.connectionMode).to.be.oneOf(['subscriber', 'shared']);
  });

  it('never exposes secrets in list response', async () => {
    const integration = await createSlackIntegration(session);
    const cleartextToken = `xoxb-list-secret-${Date.now()}`;

    await novuClient.channelConnections.create({
      integrationIdentifier: integration.identifier,
      context: { tenant: 'list-secret-check' },
      workspace: { id: 'T_list_secret' },
      auth: { accessToken: cleartextToken },
    });

    const { body } = await session.testAgent
      .get('/v1/channel-connections')
      .set('authorization', `ApiKey ${session.apiKey}`);

    const responseJson = JSON.stringify(body);

    expect(responseJson).to.not.include(cleartextToken);
    expect(responseJson).to.not.include('refreshToken');
    expect(responseJson).to.not.include('signingSecret');
    expect(responseJson).to.not.include('clientSecret');

    for (const conn of body.data) {
      expect(conn.auth.accessToken).to.equal('');
      expect(conn.connected).to.be.a('boolean');
      expect(conn.connectionMode).to.be.oneOf(['subscriber', 'shared']);
    }
  });

  it('shows connected=false when no auth token is present', async () => {
    const integration = await createSlackIntegration(session);
    const identifier = `no_auth_${Date.now()}`;

    await channelConnectionRepository.create({
      identifier,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      contextKeys: [],
      workspace: { id: 'T_no_auth' },
      auth: { accessToken: '' },
    });

    const { body } = await session.testAgent
      .get(`/v1/channel-connections/${identifier}`)
      .set('authorization', `ApiKey ${session.apiKey}`);

    const response = body.data;
    expect(response.connected).to.equal(false);
    expect(response.connectionMode).to.equal('shared');
  });
});
