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

  it('decrypts on read so callers receive the plaintext token they wrote', async () => {
    const integration = await createSlackIntegration(session);
    const cleartextToken = `xoxb-round-trip-${Date.now()}`;

    const { result: created } = await novuClient.channelConnections.create({
      integrationIdentifier: integration.identifier,
      context: { tenant: 'at-rest-round-trip' },
      workspace: { id: 'T_round_trip' },
      auth: { accessToken: cleartextToken },
    });

    const { result } = await novuClient.channelConnections.retrieve(created.identifier);
    expect(result.auth.accessToken).to.equal(cleartextToken);
  });

  it('legacy unencrypted records continue to round-trip (idempotent decrypt)', async () => {
    const integration = await createSlackIntegration(session);

    // Simulate a record written before the encryption layer existed: bypass the
    // create usecase and write a plaintext token directly via the repository.
    const legacyToken = 'xoxb-legacy-unprefixed-token';
    const legacyIdentifier = `legacy_${Date.now()}`;
    await channelConnectionRepository.create({
      identifier: legacyIdentifier,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      contextKeys: [],
      workspace: { id: 'T_legacy' },
      auth: { accessToken: legacyToken },
    });

    // Read path passes legacy unprefixed value through unchanged.
    const { result } = await novuClient.channelConnections.retrieve(legacyIdentifier);
    expect(result.auth.accessToken).to.equal(legacyToken);

    // And the legacy stored value is left untouched (no forced migration).
    const stored = await channelConnectionRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier: legacyIdentifier,
    });
    expect(stored?.auth?.accessToken).to.equal(legacyToken);
  });
});
