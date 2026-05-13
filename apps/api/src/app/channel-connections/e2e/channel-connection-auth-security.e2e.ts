import { Novu } from '@novu/api';
import { ChannelConnectionRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { createConnection, createSlackIntegration, setupChannelTests } from './helpers/channel-helpers';

const NOVU_ENCRYPTION_PREFIX = 'nvsk.';

describe('Channel Connection auth security — token redaction & at-rest encryption #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const channelConnectionRepository = new ChannelConnectionRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  /**
   * Regression for the GHSA-cg43-fcgr-x9m8 advisory — a caller with INTEGRATION_READ
   * must never receive the raw provider access token. We cover all 4 endpoints that
   * actually emit a body (retrieve, list, create, update); the 5th endpoint (delete)
   * returns 204 with no body, so there is no auth shape to assert on.
   */
  describe('Layer 2 — DTO redaction', () => {
    it('GET /channel-connections/:id does not echo accessToken in plaintext', async () => {
      const integration = await createSlackIntegration(session);
      const created = await createConnection(novuClient, integration.identifier, undefined, { tenant: 'redact-1' });

      const { result } = await novuClient.channelConnections.retrieve(created.identifier);

      const auth = result.auth as unknown as Record<string, unknown>;
      expect(auth).to.deep.equal({ hasAccessToken: true });
      expect(JSON.stringify(result)).to.not.include('xoxb-');
    });

    it('GET /channel-connections (list) does not echo accessToken in plaintext', async () => {
      const integration = await createSlackIntegration(session);
      await createConnection(novuClient, integration.identifier, undefined, { tenant: 'redact-list-a' });
      await createConnection(novuClient, integration.identifier, undefined, { tenant: 'redact-list-b' });

      const { result } = await novuClient.channelConnections.list({
        integrationIdentifier: integration.identifier,
      });

      expect(result.data.length).to.be.at.least(2);
      for (const conn of result.data) {
        const auth = conn.auth as unknown as Record<string, unknown>;
        expect(auth).to.deep.equal({ hasAccessToken: true });
        expect(auth.accessToken).to.be.undefined;
      }
      expect(JSON.stringify(result)).to.not.include('xoxb-');
    });

    it('POST /channel-connections does not echo accessToken in plaintext', async () => {
      const integration = await createSlackIntegration(session);

      const { result } = await novuClient.channelConnections.create({
        integrationIdentifier: integration.identifier,
        context: { tenant: 'redact-post' },
        workspace: { id: 'T_redact_post' },
        auth: { accessToken: 'xoxb-post-secret' },
      });

      const auth = result.auth as unknown as Record<string, unknown>;
      expect(auth).to.deep.equal({ hasAccessToken: true });
      expect(JSON.stringify(result)).to.not.include('xoxb-post-secret');
    });

    it('PATCH /channel-connections/:id does not echo accessToken in plaintext', async () => {
      const integration = await createSlackIntegration(session);
      const created = await createConnection(novuClient, integration.identifier, undefined, { tenant: 'redact-patch' });

      const { result } = await novuClient.channelConnections.update(
        {
          workspace: { id: 'T_redact_patch_new' },
          auth: { accessToken: 'xoxb-patch-secret' },
        },
        created.identifier
      );

      const auth = result.auth as unknown as Record<string, unknown>;
      expect(auth).to.deep.equal({ hasAccessToken: true });
      expect(JSON.stringify(result)).to.not.include('xoxb-patch-secret');
    });
  });

  /**
   * Regression for the at-rest layer — the stored Mongo document must hold the
   * Novu-encrypted form of the token, never the cleartext. A backup/dump leak should
   * not expose provider tokens.
   */
  describe('Layer 1 — at-rest encryption', () => {
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

      // Reads continue to work — response is presence-only but does not throw.
      const { result } = await novuClient.channelConnections.retrieve(legacyIdentifier);
      const auth = result.auth as unknown as Record<string, unknown>;
      expect(auth).to.deep.equal({ hasAccessToken: true });

      // And the legacy stored value is left untouched (no forced migration).
      const stored = await channelConnectionRepository.findOne({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: legacyIdentifier,
      });
      expect(stored?.auth?.accessToken).to.equal(legacyToken);
    });
  });
});
