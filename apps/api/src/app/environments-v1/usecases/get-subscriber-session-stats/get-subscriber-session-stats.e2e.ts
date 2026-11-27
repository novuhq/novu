import { createHash } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum, SubscriberSessionAuthMethodEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  SubscriberSessionAuthStatsService,
  SubscriberSessionSourceEnum,
} from '../../../shared/services/subscriber-session-auth-stats.service';

const integrationRepository = new IntegrationRepository();

describe('Subscriber session stats - GET /v1/environments/me/subscriber-session-stats #novu-v2', () => {
  let session: UserSession;
  let previousFlag: string | undefined;

  before(() => {
    previousFlag = process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'true';
  });

  after(() => {
    if (previousFlag === undefined) {
      delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    } else {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = previousFlag;
    }
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize({ noWidgetSession: true });
  });

  function openSession(body: Record<string, unknown>, clientVersion?: string) {
    const request = session.testAgent.post('/v1/inbox/session');
    if (clientVersion) {
      request.set('Novu-Client-Version', clientVersion);
    }

    return request.send(body).expect(201);
  }

  function openHashSession(subscriberId: string, clientVersion?: string) {
    return openSession(
      {
        applicationIdentifier: session.environment.identifier,
        subscriberId,
        subscriberHash: createHash(session.environment.apiKeys[0].key, subscriberId),
      },
      clientVersion
    );
  }

  async function openTokenSession(subscriberId: string, clientVersion: string) {
    const { body } = await session.testAgent
      .post(`/v2/subscribers/${subscriberId}/tokens`)
      .set('Authorization', `ApiKey ${session.environment.apiKeys[0].key}`)
      .send({})
      .expect(201);

    return openSession({ subscriberToken: body.data.token }, clientVersion);
  }

  function getStats(query = '') {
    return session.testAgent.get(`/v1/environments/me/subscriber-session-stats${query}`).expect(200);
  }

  it('should count each client by signed token and without token, with when it last logged in without one', async () => {
    await setHmac(session, true);
    await openHashSession('sub-1', '@novu/react-native@2.4.1');
    await openHashSession('sub-2', '@novu/react-native@2.4.1');
    await openTokenSession('sub-3', '@novu/js@3.21.0');
    await openTokenSession('sub-4', '@novu/js@3.21.0');
    await openTokenSession('sub-5', '@novu/react-native@2.4.1');
    await setHmac(session, false);
    await openSession({ applicationIdentifier: session.environment.identifier, subscriberId: 'sub-6' });
    await recordDaysAgo(12, SubscriberSessionAuthMethodEnum.HMAC, '@novu/react@3.14.0');

    const { body } = await getStats();

    expect(body.data).to.deep.equal({
      days: 30,
      available: true,
      clients: [
        { client: '@novu/react-native@2.4.1', token: 1, withoutToken: 2, lastSeenWithoutTokenDaysAgo: 0 },
        { client: '@novu/react@3.14.0', token: 0, withoutToken: 1, lastSeenWithoutTokenDaysAgo: 12 },
        { client: 'unknown', token: 0, withoutToken: 1, lastSeenWithoutTokenDaysAgo: 0 },
        { client: '@novu/js@3.21.0', token: 2, withoutToken: 0, lastSeenWithoutTokenDaysAgo: null },
      ],
    });

    const { body: lastWeek } = await getStats('?days=7');
    expect(lastWeek.data.clients.map((row: { client: string }) => row.client)).to.not.include('@novu/react@3.14.0');
  });

  async function recordDaysAgo(days: number, authMethod: SubscriberSessionAuthMethodEnum, clientVersion: string) {
    const clock = sinon.useFakeTimers({ now: Date.now() - days * 24 * 60 * 60 * 1000, toFake: ['Date'] });
    try {
      await testServer.getService(SubscriberSessionAuthStatsService).record({
        environmentId: session.environment._id,
        authMethod,
        clientVersion,
        source: SubscriberSessionSourceEnum.INBOX,
      });
    } finally {
      clock.restore();
    }
  }

  it("should not count another environment's sessions", async () => {
    await setHmac(session, true);
    await openHashSession('dev-sub', '@novu/js@3.14.0');

    await session.switchToProdEnvironment();
    await setHmac(session, true);
    await openHashSession('prod-sub-1', '@novu/js@3.14.0');
    await openHashSession('prod-sub-2', '@novu/js@3.14.0');
    const { body: production } = await getStats();

    await session.switchToDevEnvironment();
    const { body: development } = await getStats();

    expect(production.data.clients).to.deep.equal([
      { client: '@novu/js@3.14.0', token: 0, withoutToken: 2, lastSeenWithoutTokenDaysAgo: 0 },
    ]);
    expect(development.data.clients).to.deep.equal([
      { client: '@novu/js@3.14.0', token: 0, withoutToken: 1, lastSeenWithoutTokenDaysAgo: 0 },
    ]);
  });

  it('should refuse a window outside the 35 days the counts are kept', async () => {
    await session.testAgent.get('/v1/environments/me/subscriber-session-stats?days=90').expect(422);
    await session.testAgent.get('/v1/environments/me/subscriber-session-stats?days=0').expect(422);
    expect((await getStats('?days=35')).body.data.days).to.equal(35);
  });

  it('should report the counts as unavailable, not zero, when they cannot be read', async () => {
    const stub = sinon.stub(testServer.getService(SubscriberSessionAuthStatsService), 'countByDay').resolves(null);

    try {
      const { body } = await getStats();

      expect(body.data).to.deep.equal({ days: 30, available: false, clients: [] });
    } finally {
      stub.restore();
    }
  });
});

async function setHmac(owner: UserSession, hmac: boolean) {
  await integrationRepository.update(
    {
      _environmentId: owner.environment._id,
      _organizationId: owner.environment._organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    { $set: { 'credentials.hmac': hmac, active: true } }
  );
}
