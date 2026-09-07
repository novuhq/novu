import { createContextHash } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ContextPayload } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const integrationRepository = new IntegrationRepository();

describe('Generate Connect OAuth URL - /integrations/channel-connections/oauth (POST) #novu-v2', () => {
  let session: UserSession;
  let integrationIdentifier: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    integrationIdentifier = `slack-connect-hmac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: { hmac: true, clientId: 'test-client-id' },
      active: true,
      identifier: integrationIdentifier,
    });
  });

  function generateConnectOAuthUrl(payload: Record<string, unknown>) {
    return session.testAgent.post('/v1/integrations/channel-connections/oauth').send(payload);
  }

  it('should accept a valid contextHash when HMAC validation is enabled', async () => {
    const secretKey = session.environment.apiKeys[0].key;
    const context: ContextPayload = { tenant: 'acme' };
    const contextHash = createContextHash(secretKey, context);

    const { body, status } = await generateConnectOAuthUrl({
      integrationIdentifier,
      context,
      contextHash,
      connectionMode: 'shared',
    });

    expect(status).to.equal(201);
    expect(body.data.url).to.contain('https://slack.com/oauth/v2/authorize');
  });

  it('should reject the request when contextHash is missing and HMAC validation is enabled', async () => {
    const { body, status } = await generateConnectOAuthUrl({
      integrationIdentifier,
      context: { tenant: 'acme' },
      connectionMode: 'shared',
    });

    expect(status).to.equal(400);
    expect(body.message).to.contain('A valid contextHash is required when HMAC validation is enabled.');
  });

  it('should reject the request when contextHash does not match the context', async () => {
    const secretKey = session.environment.apiKeys[0].key;
    const contextHash = createContextHash(secretKey, { tenant: 'acme' });

    const { body, status } = await generateConnectOAuthUrl({
      integrationIdentifier,
      context: { tenant: 'malicious' },
      contextHash,
      connectionMode: 'shared',
    });

    expect(status).to.equal(400);
    expect(body.message).to.contain('Please provide a valid context HMAC hash');
  });

  describe('Generate Link User OAuth URL - /integrations/channel-endpoints/oauth (POST)', () => {
    function generateLinkUserOAuthUrl(payload: Record<string, unknown>) {
      return session.testAgent.post('/v1/integrations/channel-endpoints/oauth').send(payload);
    }

    it('should accept a valid contextHash when HMAC validation is enabled', async () => {
      const secretKey = session.environment.apiKeys[0].key;
      const context: ContextPayload = { tenant: 'acme' };
      const contextHash = createContextHash(secretKey, context);

      const { body, status } = await generateLinkUserOAuthUrl({
        integrationIdentifier,
        subscriberId: session.subscriberId,
        context,
        contextHash,
      });

      expect(status).to.equal(201);
      expect(body.data.url).to.contain('https://slack.com/oauth/v2/authorize');
    });

    it('should reject the request when contextHash is missing and HMAC validation is enabled', async () => {
      const { body, status } = await generateLinkUserOAuthUrl({
        integrationIdentifier,
        subscriberId: session.subscriberId,
        context: { tenant: 'acme' },
      });

      expect(status).to.equal(400);
      expect(body.message).to.contain('A valid contextHash is required when HMAC validation is enabled.');
    });

    it('should reject the request when contextHash does not match the context', async () => {
      const secretKey = session.environment.apiKeys[0].key;
      const contextHash = createContextHash(secretKey, { tenant: 'acme' });

      const { body, status } = await generateLinkUserOAuthUrl({
        integrationIdentifier,
        subscriberId: session.subscriberId,
        context: { tenant: 'malicious' },
        contextHash,
      });

      expect(status).to.equal(400);
      expect(body.message).to.contain('Please provide a valid context HMAC hash');
    });
  });
});
