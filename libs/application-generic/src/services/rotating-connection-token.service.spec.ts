import { BadGatewayException } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import axios from 'axios';
import sinon from 'sinon';
import { decryptChannelConnectionAuth, encryptChannelConnectionAuth } from '../encryption';
import { RotatingConnectionTokenService } from './rotating-connection-token.service';

// The prefix-based auth encryption reads this at call time (32-char key required)
process.env.STORE_ENCRYPTION_KEY = process.env.STORE_ENCRYPTION_KEY || '01234567890123456789012345678901';

const MOCK_ORGANIZATION_ID = 'org-1';
const MOCK_ENVIRONMENT_ID = 'env-1';
const MOCK_CONNECTION_IDENTIFIER = 'conn-1';
const MOCK_INTEGRATION_IDENTIFIER = 'chat-integration';
const MOCK_ACCESS_TOKEN = 'xoxe.xoxb-current-token';
const MOCK_REFRESH_TOKEN = 'xoxe-1-refresh-token';
const MOCK_NEW_ACCESS_TOKEN = 'xoxe.xoxb-new-token';
const MOCK_NEW_REFRESH_TOKEN = 'xoxe-1-new-refresh-token';

function futureIso(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function pastIso(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function buildConnection(auth: Record<string, unknown>, providerId: ChatProviderIdEnum = ChatProviderIdEnum.Slack) {
  return {
    _organizationId: MOCK_ORGANIZATION_ID,
    _environmentId: MOCK_ENVIRONMENT_ID,
    identifier: MOCK_CONNECTION_IDENTIFIER,
    integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
    providerId,
    auth: encryptChannelConnectionAuth(auth),
  } as any;
}

function buildHarness() {
  const cacheService = {
    cacheEnabled: sinon.stub().returns(true),
    setIfNotExist: sinon.stub().resolves('OK'),
    del: sinon.stub().resolves(1),
  };
  const channelConnectionRepository = {
    findOne: sinon.stub().resolves(null),
    findOneAndUpdate: sinon.stub().resolves(null),
  };
  const integrationRepository = {
    findOne: sinon.stub().resolves({
      credentials: { clientId: 'chat-client-id', secretKey: 'chat-client-secret' },
    }),
  };

  const service = new RotatingConnectionTokenService(
    cacheService as any,
    channelConnectionRepository as any,
    integrationRepository as any
  );

  return { service, cacheService, channelConnectionRepository, integrationRepository };
}

describe('RotatingConnectionTokenService', () => {
  let axiosPost: sinon.SinonStub;

  beforeEach(() => {
    axiosPost = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns undefined when the connection has no access token', async () => {
    const { service } = buildHarness();

    const token = await service.getConnectionToken(buildConnection({}));

    expect(token).toBeUndefined();
    expect(axiosPost.called).toBe(false);
  });

  it('returns the stored token unchanged for legacy connections without a refresh token', async () => {
    const { service } = buildHarness();
    const connection = buildConnection({ accessToken: MOCK_ACCESS_TOKEN });

    const token = await service.getConnectionToken(connection);

    expect(token).toEqual(MOCK_ACCESS_TOKEN);
    expect(axiosPost.called).toBe(false);
  });

  it('returns the stored token unchanged when it is not close to expiry', async () => {
    const { service } = buildHarness();
    const connection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: futureIso(60 * 60 * 1000),
    });

    const token = await service.getConnectionToken(connection);

    expect(token).toEqual(MOCK_ACCESS_TOKEN);
    expect(axiosPost.called).toBe(false);
  });

  it('returns the stored token unchanged for a provider without a rotation config', async () => {
    const { service } = buildHarness();
    const connection = buildConnection(
      {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      },
      ChatProviderIdEnum.Discord
    );

    const token = await service.getConnectionToken(connection);

    expect(token).toEqual(MOCK_ACCESS_TOKEN);
    expect(axiosPost.called).toBe(false);
  });

  it('refreshes an expiring Slack token, persists the new pair encrypted, and releases the lock', async () => {
    const { service, cacheService, channelConnectionRepository } = buildHarness();
    const connection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: futureIso(60 * 1000),
    });
    channelConnectionRepository.findOne.resolves(connection);

    axiosPost.resolves({
      data: {
        ok: true,
        access_token: MOCK_NEW_ACCESS_TOKEN,
        refresh_token: MOCK_NEW_REFRESH_TOKEN,
        expires_in: 12 * 60 * 60,
      },
    });

    const token = await service.getConnectionToken(connection);

    expect(token).toEqual(MOCK_NEW_ACCESS_TOKEN);

    const [url, body, config] = axiosPost.firstCall.args;
    expect(url).toEqual('https://slack.com/api/oauth.v2.access');
    expect(config.timeout).toEqual(10000);
    const params = new URLSearchParams(body as string);
    expect(params.get('grant_type')).toEqual('refresh_token');
    expect(params.get('refresh_token')).toEqual(MOCK_REFRESH_TOKEN);
    expect(params.get('client_id')).toEqual('chat-client-id');
    expect(params.get('client_secret')).toEqual('chat-client-secret');

    expect(channelConnectionRepository.findOneAndUpdate.calledOnce).toBe(true);
    const [query, update] = channelConnectionRepository.findOneAndUpdate.firstCall.args;
    expect(query.identifier).toEqual(MOCK_CONNECTION_IDENTIFIER);
    const persistedAuth = update.$set.auth;
    expect((persistedAuth.accessToken as string).startsWith('nvsk.')).toBe(true);
    const decrypted = decryptChannelConnectionAuth(persistedAuth);
    expect(decrypted.accessToken).toEqual(MOCK_NEW_ACCESS_TOKEN);
    expect(decrypted.refreshToken).toEqual(MOCK_NEW_REFRESH_TOKEN);
    expect(new Date(decrypted.expiresAt as string).getTime()).toBeGreaterThan(Date.now());

    expect(cacheService.setIfNotExist.calledOnce).toBe(true);
    expect(cacheService.del.calledOnce).toBe(true);
  });

  it('refreshes an expiring Novu-managed Slack token using the env-var OAuth client', async () => {
    process.env.NOVU_SLACK_INTEGRATION_CLIENT_ID = 'novu-slack-client-id';
    process.env.NOVU_SLACK_INTEGRATION_CLIENT_SECRET = 'novu-slack-client-secret';

    const { service, integrationRepository, channelConnectionRepository } = buildHarness();
    // The Novu demo Slack integration stores no credentials on the integration document.
    integrationRepository.findOne.resolves({ providerId: ChatProviderIdEnum.Novu });
    const connection = buildConnection(
      {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      },
      ChatProviderIdEnum.Novu
    );
    channelConnectionRepository.findOne.resolves(connection);

    axiosPost.resolves({
      data: { ok: true, access_token: MOCK_NEW_ACCESS_TOKEN, expires_in: 3600 },
    });

    const token = await service.getConnectionToken(connection);

    expect(token).toEqual(MOCK_NEW_ACCESS_TOKEN);
    const [url, body] = axiosPost.firstCall.args;
    expect(url).toEqual('https://slack.com/api/oauth.v2.access');
    const params = new URLSearchParams(body as string);
    expect(params.get('client_id')).toEqual('novu-slack-client-id');
    expect(params.get('client_secret')).toEqual('novu-slack-client-secret');
  });

  it('keeps the previous refresh token when the provider does not return a new one', async () => {
    const { service, channelConnectionRepository } = buildHarness();
    const connection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: futureIso(60 * 1000),
    });
    channelConnectionRepository.findOne.resolves(connection);

    axiosPost.resolves({
      data: { ok: true, access_token: MOCK_NEW_ACCESS_TOKEN, expires_in: 3600 },
    });

    await service.getConnectionToken(connection);

    const [, update] = channelConnectionRepository.findOneAndUpdate.firstCall.args;
    const decrypted = decryptChannelConnectionAuth(update.$set.auth);
    expect(decrypted.refreshToken).toEqual(MOCK_REFRESH_TOKEN);
  });

  it('skips the refresh call when another process already refreshed before the lock was acquired', async () => {
    const { service, channelConnectionRepository } = buildHarness();
    const staleConnection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: futureIso(60 * 1000),
    });
    const refreshedConnection = buildConnection({
      accessToken: MOCK_NEW_ACCESS_TOKEN,
      refreshToken: MOCK_NEW_REFRESH_TOKEN,
      expiresAt: futureIso(12 * 60 * 60 * 1000),
    });
    channelConnectionRepository.findOne.resolves(refreshedConnection);

    const token = await service.getConnectionToken(staleConnection);

    expect(token).toEqual(MOCK_NEW_ACCESS_TOKEN);
    expect(axiosPost.called).toBe(false);
    expect(channelConnectionRepository.findOneAndUpdate.called).toBe(false);
  });

  it('returns the currently stored token immediately when it loses the lock race', async () => {
    const { service, cacheService, channelConnectionRepository } = buildHarness();
    const staleConnection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: futureIso(60 * 1000),
    });

    cacheService.setIfNotExist.resolves(null);

    const token = await service.getConnectionToken(staleConnection);

    // Refresh fires 5 minutes before expiry, so the stored token is still valid.
    expect(token).toEqual(MOCK_ACCESS_TOKEN);
    expect(axiosPost.called).toBe(false);
    expect(channelConnectionRepository.findOne.called).toBe(false);
    expect(channelConnectionRepository.findOneAndUpdate.called).toBe(false);
    expect(cacheService.del.called).toBe(false);
  });

  it('waits for the lock holder and returns the refreshed token when the stored token is already expired', async () => {
    const { service, cacheService, channelConnectionRepository } = buildHarness();
    const expiredConnection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: pastIso(60 * 1000),
    });
    const refreshedConnection = buildConnection({
      accessToken: MOCK_NEW_ACCESS_TOKEN,
      refreshToken: MOCK_NEW_REFRESH_TOKEN,
      expiresAt: futureIso(12 * 60 * 60 * 1000),
    });

    cacheService.setIfNotExist.resolves(null);
    channelConnectionRepository.findOne.onFirstCall().resolves(expiredConnection);
    channelConnectionRepository.findOne.onSecondCall().resolves(refreshedConnection);

    const token = await service.getConnectionToken(expiredConnection);

    expect(token).toEqual(MOCK_NEW_ACCESS_TOKEN);
    expect(axiosPost.called).toBe(false);
    expect(channelConnectionRepository.findOneAndUpdate.called).toBe(false);
    expect(cacheService.del.called).toBe(false);
  });

  it('throws when the lock holder never persists a fresh token before the wait budget expires', async () => {
    const { service, cacheService, channelConnectionRepository } = buildHarness();
    const expiredConnection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: pastIso(60 * 1000),
    });

    cacheService.setIfNotExist.resolves(null);
    channelConnectionRepository.findOne.resolves(expiredConnection);

    await expect(service.getConnectionToken(expiredConnection)).rejects.toThrow(BadGatewayException);
    expect(axiosPost.called).toBe(false);
    expect(channelConnectionRepository.findOneAndUpdate.called).toBe(false);
  });

  it('refreshes without a lock when the cache is disabled', async () => {
    const { service, cacheService } = buildHarness();
    cacheService.cacheEnabled.returns(false);
    const connection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: futureIso(60 * 1000),
    });

    axiosPost.resolves({
      data: { ok: true, access_token: MOCK_NEW_ACCESS_TOKEN, expires_in: 3600 },
    });

    const token = await service.getConnectionToken(connection);

    expect(token).toEqual(MOCK_NEW_ACCESS_TOKEN);
    expect(cacheService.setIfNotExist.called).toBe(false);
  });

  it('throws a BadGatewayException with a reconnect hint when Slack rejects the refresh', async () => {
    const { service, channelConnectionRepository } = buildHarness();
    const connection = buildConnection({
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      expiresAt: futureIso(60 * 1000),
    });
    channelConnectionRepository.findOne.resolves(connection);

    // Slack returns HTTP 200 with ok: false on API-level errors
    axiosPost.resolves({ data: { ok: false, error: 'invalid_refresh_token' } });

    await expect(service.getConnectionToken(connection)).rejects.toThrow(BadGatewayException);
    await expect(service.getConnectionToken(connection)).rejects.toThrow(
      /invalid_refresh_token.*Reconnect the Slack channel connection/
    );
    expect(channelConnectionRepository.findOneAndUpdate.called).toBe(false);
  });

  it('refreshes a Webex token and persists the refresh-token expiry', async () => {
    const { service, channelConnectionRepository } = buildHarness();
    const connection = buildConnection(
      {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      },
      ChatProviderIdEnum.WebexMessaging
    );
    channelConnectionRepository.findOne.resolves(connection);

    axiosPost.resolves({
      data: {
        access_token: MOCK_NEW_ACCESS_TOKEN,
        refresh_token: MOCK_NEW_REFRESH_TOKEN,
        expires_in: 3600,
        refresh_token_expires_in: 7200,
      },
    });

    const token = await service.getConnectionToken(connection);

    expect(token).toEqual(MOCK_NEW_ACCESS_TOKEN);
    const [url] = axiosPost.firstCall.args;
    expect(url).toEqual('https://webexapis.com/v1/access_token');

    const [, update] = channelConnectionRepository.findOneAndUpdate.firstCall.args;
    const decrypted = decryptChannelConnectionAuth(update.$set.auth);
    expect(decrypted.accessToken).toEqual(MOCK_NEW_ACCESS_TOKEN);
    expect(decrypted.refreshToken).toEqual(MOCK_NEW_REFRESH_TOKEN);
    expect(new Date(decrypted.refreshTokenExpiresAt as string).getTime()).toBeGreaterThan(Date.now());
  });

  it('throws a BadGatewayException with the extracted message when the refresh HTTP call fails', async () => {
    const { service, channelConnectionRepository } = buildHarness();
    const connection = buildConnection(
      {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      },
      ChatProviderIdEnum.WebexMessaging
    );
    channelConnectionRepository.findOne.resolves(connection);

    axiosPost.rejects(
      new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 500,
        data: { message: 'server oops' },
      } as any)
    );

    await expect(service.getConnectionToken(connection)).rejects.toThrow(
      /Webex token refresh failed \(HTTP 500\): server oops.*Reconnect the Webex channel connection/
    );
    expect(channelConnectionRepository.findOneAndUpdate.called).toBe(false);
  });

  describe('in-process refresh coalescing', () => {
    it('coalesces concurrent calls into a single refresh when the cache is disabled', async () => {
      const { service, cacheService, channelConnectionRepository } = buildHarness();
      cacheService.cacheEnabled.returns(false);
      const connection = buildConnection({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      });

      const deferred = createDeferred<{ data: unknown }>();
      axiosPost.returns(deferred.promise);

      const waiters = Promise.all([
        service.getConnectionToken(connection),
        service.getConnectionToken(connection),
        service.getConnectionToken(connection),
      ]);

      deferred.resolve({
        data: {
          ok: true,
          access_token: MOCK_NEW_ACCESS_TOKEN,
          refresh_token: MOCK_NEW_REFRESH_TOKEN,
          expires_in: 3600,
        },
      });

      const tokens = await waiters;

      expect(tokens).toEqual([MOCK_NEW_ACCESS_TOKEN, MOCK_NEW_ACCESS_TOKEN, MOCK_NEW_ACCESS_TOKEN]);
      expect(axiosPost.callCount).toEqual(1);
      expect(channelConnectionRepository.findOneAndUpdate.calledOnce).toBe(true);
    });

    it('coalesces concurrent calls into a single Redis-locked refresh when the cache is enabled', async () => {
      const { service, cacheService, channelConnectionRepository } = buildHarness();
      const connection = buildConnection({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      });
      channelConnectionRepository.findOne.resolves(connection);

      const deferred = createDeferred<{ data: unknown }>();
      axiosPost.returns(deferred.promise);

      const waiters = Promise.all([
        service.getConnectionToken(connection),
        service.getConnectionToken(connection),
        service.getConnectionToken(connection),
      ]);

      deferred.resolve({
        data: {
          ok: true,
          access_token: MOCK_NEW_ACCESS_TOKEN,
          refresh_token: MOCK_NEW_REFRESH_TOKEN,
          expires_in: 3600,
        },
      });

      const tokens = await waiters;

      expect(tokens).toEqual([MOCK_NEW_ACCESS_TOKEN, MOCK_NEW_ACCESS_TOKEN, MOCK_NEW_ACCESS_TOKEN]);
      expect(axiosPost.callCount).toEqual(1);
      expect(cacheService.setIfNotExist.calledOnce).toBe(true);
      expect(cacheService.del.calledOnce).toBe(true);
    });

    it('propagates a shared refresh failure to every coalesced waiter, then retries on the next call', async () => {
      const { service, channelConnectionRepository } = buildHarness();
      const connection = buildConnection({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      });
      channelConnectionRepository.findOne.resolves(connection);

      const deferred = createDeferred<{ data: unknown }>();
      axiosPost.onFirstCall().returns(deferred.promise);
      axiosPost.onSecondCall().resolves({
        data: {
          ok: true,
          access_token: MOCK_NEW_ACCESS_TOKEN,
          refresh_token: MOCK_NEW_REFRESH_TOKEN,
          expires_in: 3600,
        },
      });

      const waiters = Promise.allSettled([
        service.getConnectionToken(connection),
        service.getConnectionToken(connection),
      ]);

      deferred.resolve({ data: { ok: false, error: 'invalid_refresh_token' } });

      const results = await waiters;

      expect(results.every((result) => result.status === 'rejected')).toBe(true);
      expect(axiosPost.callCount).toEqual(1);

      // The coalescing map entry is cleared on settle (success or failure), so a call
      // after the failure retries the refresh rather than replaying the stale rejection.
      const retriedToken = await service.getConnectionToken(connection);
      expect(retriedToken).toEqual(MOCK_NEW_ACCESS_TOKEN);
      expect(axiosPost.callCount).toEqual(2);
    });

    it('does not coalesce concurrent calls for different connections', async () => {
      const { service, channelConnectionRepository } = buildHarness();
      const connectionA = buildConnection({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: futureIso(60 * 1000),
      });
      const connectionB = {
        ...buildConnection({
          accessToken: MOCK_ACCESS_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
          expiresAt: futureIso(60 * 1000),
        }),
        identifier: 'conn-2',
      };
      channelConnectionRepository.findOne.callsFake(async (query: { identifier: string }) =>
        query.identifier === connectionA.identifier ? connectionA : connectionB
      );

      axiosPost.resolves({
        data: {
          ok: true,
          access_token: MOCK_NEW_ACCESS_TOKEN,
          refresh_token: MOCK_NEW_REFRESH_TOKEN,
          expires_in: 3600,
        },
      });

      await Promise.all([service.getConnectionToken(connectionA), service.getConnectionToken(connectionB)]);

      expect(axiosPost.callCount).toEqual(2);
    });
  });
});
