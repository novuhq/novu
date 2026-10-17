import { CallHandler, ExecutionContext, HttpException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { expect } from 'chai';
import { lastValueFrom, of } from 'rxjs';
import sinon from 'sinon';

import { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { hashApiKey, KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX } from './keyless-agent-environment';
import { KeylessScopeInterceptor } from './keyless-scope.interceptor';
import { KeylessTriggerCapService } from './keyless-trigger-cap.service';

const KEYLESS_ORG_ID = '6a0000000000000000000001';
const ENV_ID = '6a0000000000000000000002';
const SECRET_KEY = 'sk_test_secret';

const MANAGED_ENV_KEYS = [
  'KEYLESS_ORGANIZATION_ID',
  'KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS',
  'KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY',
  'DASHBOARD_URL',
  'FRONT_BASE_URL',
];

interface RequestOverrides {
  method?: string;
  path?: string;
  routePath?: string;
  authScheme?: string;
  scheme?: ApiAuthSchemeEnum;
  organizationId?: string;
  authorization?: string;
  body?: unknown;
  withUser?: boolean;
}

function buildRequest(overrides: RequestOverrides = {}) {
  const path = overrides.path ?? '/v2/workflows';

  return {
    method: overrides.method ?? 'GET',
    path,
    route: { path: overrides.routePath ?? path },
    authScheme: overrides.authScheme ?? ApiAuthSchemeEnum.API_KEY,
    headers: { authorization: overrides.authorization ?? `ApiKey ${SECRET_KEY}` },
    body: overrides.body ?? {},
    user:
      overrides.withUser === false
        ? undefined
        : {
            _id: 'user-id',
            organizationId: overrides.organizationId ?? KEYLESS_ORG_ID,
            environmentId: ENV_ID,
            scheme: overrides.scheme ?? ApiAuthSchemeEnum.API_KEY,
          },
  };
}

function buildContext(request: ReturnType<typeof buildRequest>): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function agentEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    _id: ENV_ID,
    _organizationId: KEYLESS_ORG_ID,
    identifier: 'Xk3m9QpL2aZt',
    name: `${KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX}2026-10-14T12:00:00.000Z`,
    createdAt: new Date().toISOString(),
    apiKeys: [{ hash: hashApiKey(SECRET_KEY) }],
    ...overrides,
  };
}

describe('KeylessScopeInterceptor', () => {
  const originalEnv: Record<string, string | undefined> = {};
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let subscriberRepository: sinon.SinonStubbedInstance<SubscriberRepository>;
  let topicSubscribersRepository: sinon.SinonStubbedInstance<TopicSubscribersRepository>;
  let connectClaimTokenService: sinon.SinonStubbedInstance<ConnectClaimTokenService>;
  let triggerCapService: sinon.SinonStubbedInstance<KeylessTriggerCapService>;
  let interceptor: KeylessScopeInterceptor;
  let handler: CallHandler;

  beforeEach(() => {
    for (const key of MANAGED_ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.KEYLESS_ORGANIZATION_ID = KEYLESS_ORG_ID;
    process.env.DASHBOARD_URL = 'https://dashboard.example.com';
    delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;
    delete process.env.KEYLESS_AGENT_TRIGGER_CAP_PER_ENV_PER_DAY;

    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    environmentRepository.findOne.resolves(agentEnvironment() as never);
    subscriberRepository = sinon.createStubInstance(SubscriberRepository);
    topicSubscribersRepository = sinon.createStubInstance(TopicSubscribersRepository);
    connectClaimTokenService = sinon.createStubInstance(ConnectClaimTokenService);
    connectClaimTokenService.issueOrGetForEnvironment.resolves({
      token: 'nvct_token',
      expiresAt: new Date().toISOString(),
    });
    triggerCapService = sinon.createStubInstance(KeylessTriggerCapService);
    triggerCapService.consume.resolves({ allowed: true, cap: 200 });
    const logger = sinon.createStubInstance(PinoLogger);

    interceptor = new KeylessScopeInterceptor(
      environmentRepository,
      subscriberRepository,
      topicSubscribersRepository,
      connectClaimTokenService,
      triggerCapService,
      logger as unknown as PinoLogger
    );
    handler = { handle: sinon.stub().returns(of('handled')) };
  });

  afterEach(() => {
    for (const key of MANAGED_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    sinon.restore();
  });

  async function run(overrides: RequestOverrides = {}): Promise<unknown> {
    const observable = await interceptor.intercept(buildContext(buildRequest(overrides)), handler);

    return lastValueFrom(observable);
  }

  async function runExpectingError(overrides: RequestOverrides = {}): Promise<HttpException> {
    try {
      await run(overrides);
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);

      return error as HttpException;
    }

    return expect.fail('Expected the interceptor to reject the request');
  }

  function errorBody(error: HttpException): Record<string, unknown> {
    return error.getResponse() as Record<string, unknown>;
  }

  describe('pass-through without any lookup', () => {
    const passThroughCases: Array<[string, RequestOverrides]> = [
      ['Bearer (dashboard) requests', { authScheme: ApiAuthSchemeEnum.BEARER, scheme: ApiAuthSchemeEnum.BEARER }],
      [
        'subscriber JWT requests',
        { authScheme: ApiAuthSchemeEnum.BEARER, scheme: ApiAuthSchemeEnum.BEARER, path: '/v1/inbox/notifications' },
      ],
      ['ApiKey requests from other organizations', { organizationId: 'regular-org-id', path: '/v1/environments' }],
      ['unauthenticated requests', { withUser: false, authScheme: 'None', path: '/v1/environments' }],
    ];

    for (const [name, overrides] of passThroughCases) {
      it(`lets ${name} through`, async () => {
        expect(await run({ path: '/v1/environments', ...overrides })).to.equal('handled');
        expect(environmentRepository.findOne.called).to.equal(false);
      });
    }

    it('lets ApiKey requests through when no keyless organization is configured', async () => {
      delete process.env.KEYLESS_ORGANIZATION_ID;

      expect(await run({ path: '/v1/environments' })).to.equal('handled');
      expect(environmentRepository.findOne.called).to.equal(false);
    });
  });

  describe('Keyless scheme', () => {
    const keylessScheme = { authScheme: ApiAuthSchemeEnum.KEYLESS, scheme: ApiAuthSchemeEnum.KEYLESS };

    it('lets pk_keyless_ demo environments through on any route', async () => {
      environmentRepository.findOne.resolves({ identifier: 'pk_keyless_abc_1234' } as never);

      expect(await run({ path: '/v1/environments', ...keylessScheme })).to.equal('handled');
    });

    it('rejects agent environments reached through their public identifier', async () => {
      environmentRepository.findOne.resolves({ identifier: 'Xk3m9QpL2aZt' } as never);

      const error = await runExpectingError({ path: '/v1/events/trigger', ...keylessScheme });

      expect(error.getStatus()).to.equal(401);
      expect(errorBody(error).code).to.equal('keyless_requires_account');
      expect(handler.handle).to.have.property('called', false);
    });

    it('rejects when the environment no longer exists', async () => {
      environmentRepository.findOne.resolves(null);

      const error = await runExpectingError({ ...keylessScheme });

      expect(error.getStatus()).to.equal(401);
    });
  });

  describe('allowlist', () => {
    it('lets allowlisted routes through after scoping the lookup to the key environment', async () => {
      expect(await run({ method: 'POST', path: '/v2/workflows' })).to.equal('handled');
      expect(environmentRepository.findOne.firstCall.args[0]).to.deep.equal({
        _id: ENV_ID,
        _organizationId: KEYLESS_ORG_ID,
      });
    });

    it('allows GET /v1/environments/me', async () => {
      expect(await run({ method: 'GET', path: '/v1/environments/me' })).to.equal('handled');
    });

    for (const [method, path] of [
      ['GET', '/v1/environments'],
      ['POST', '/v1/environments'],
      ['GET', '/v1/users/me'],
      ['GET', '/v1/organizations'],
      ['GET', '/v2/topics'],
      ['POST', '/v1/bridge/sync'],
      ['GET', '/v2/layouts'],
      ['GET', '/v1/workflows'],
      ['PUT', '/v1/environments/me'],
      ['PUT', '/v2/workflows/order-shipped/sync'],
    ]) {
      it(`rejects ${method} ${path} with keyless_requires_account and a claim URL`, async () => {
        const error = await runExpectingError({ method, path });

        expect(error.getStatus()).to.equal(403);
        expect(errorBody(error)).to.include({
          statusCode: 403,
          code: 'keyless_requires_account',
          claimUrl: 'https://dashboard.example.com/connect/claim?token=nvct_token',
        });
        expect(errorBody(error).message).to.include('https://dashboard.example.com/connect/claim?token=nvct_token');
        expect(handler.handle).to.have.property('called', false);
      });
    }

    it('rejects when the matched route is not allowlisted even if the raw path is', async () => {
      const error = await runExpectingError({ path: '/v1/events/x', routePath: '/v1/environments' });

      expect(error.getStatus()).to.equal(403);
    });

    it('rejects creating a Novu-managed delivery integration', async () => {
      const error = await runExpectingError({
        method: 'POST',
        path: '/v1/integrations',
        body: { providerId: 'novu-email', channel: 'email' },
      });

      expect(error.getStatus()).to.equal(403);
      expect(handler.handle).to.have.property('called', false);
    });

    it('lets other integrations be created', async () => {
      const body = { providerId: 'telegram', channel: 'chat' };

      expect(await run({ method: 'POST', path: '/v1/integrations', body })).to.equal('handled');
    });

    it('omits the claim URL for environments that are not agent environments', async () => {
      environmentRepository.findOne.resolves(agentEnvironment({ name: 'Development' }) as never);

      const error = await runExpectingError({ path: '/v1/environments' });

      expect(errorBody(error).code).to.equal('keyless_requires_account');
      expect(errorBody(error)).to.not.have.property('claimUrl');
      expect(connectClaimTokenService.issueOrGetForEnvironment.called).to.equal(false);
    });

    it('still rejects without a claim URL when the claim token cache fails', async () => {
      connectClaimTokenService.issueOrGetForEnvironment.rejects(new Error('redis down'));

      const error = await runExpectingError({ path: '/v1/environments' });

      expect(error.getStatus()).to.equal(403);
      expect(errorBody(error)).to.not.have.property('claimUrl');
    });
  });

  describe('revoked keys', () => {
    it('rejects a key whose hash is no longer on the environment with keyless_environment_claimed', async () => {
      environmentRepository.findOne.resolves(agentEnvironment({ apiKeys: [] }) as never);

      const error = await runExpectingError();

      expect(error.getStatus()).to.equal(401);
      expect(errorBody(error)).to.include({ statusCode: 401, code: 'keyless_environment_claimed' });
    });

    it('rejects when the environment no longer exists', async () => {
      environmentRepository.findOne.resolves(null);

      const error = await runExpectingError();

      expect(errorBody(error).code).to.equal('keyless_environment_claimed');
    });

    it('rejects when the presented header does not carry the ApiKey prefix', async () => {
      const error = await runExpectingError({ authorization: SECRET_KEY });

      expect(errorBody(error).code).to.equal('keyless_environment_claimed');
    });
  });

  describe('expiry', () => {
    it('rejects an expired agent environment with keyless_environment_expired', async () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '0';

      const error = await runExpectingError();

      expect(error.getStatus()).to.equal(401);
      expect(errorBody(error)).to.include({ statusCode: 401, code: 'keyless_environment_expired' });
      expect(errorBody(error).message).to.include(String(errorBody(error).expiresAt));
    });

    it('treats an agent environment without createdAt as expired', async () => {
      environmentRepository.findOne.resolves(agentEnvironment({ createdAt: undefined }) as never);

      const error = await runExpectingError();

      expect(errorBody(error).code).to.equal('keyless_environment_expired');
    });

    it('never expires a non-agent environment in the keyless organization', async () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '0';
      environmentRepository.findOne.resolves(agentEnvironment({ name: 'Development' }) as never);

      expect(await run()).to.equal('handled');
    });

    it('checks the key before expiry', async () => {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '0';
      environmentRepository.findOne.resolves(agentEnvironment({ apiKeys: [] }) as never);

      const error = await runExpectingError();

      expect(errorBody(error).code).to.equal('keyless_environment_claimed');
    });
  });

  describe('trigger cap', () => {
    it('consumes the recipient units of a trigger', async () => {
      await run({ method: 'POST', path: '/v1/events/trigger', body: { to: ['a', 'b'] } });

      expect(triggerCapService.consume.firstCall.args).to.deep.equal([ENV_ID, 2]);
    });

    it('rejects with keyless_trigger_limit_reached when the cap is exhausted', async () => {
      triggerCapService.consume.resolves({ allowed: false, cap: 200 });

      const error = await runExpectingError({ method: 'POST', path: '/v1/events/trigger/bulk', body: { events: [] } });

      expect(error.getStatus()).to.equal(429);
      expect(errorBody(error)).to.include({
        statusCode: 429,
        code: 'keyless_trigger_limit_reached',
        claimUrl: 'https://dashboard.example.com/connect/claim?token=nvct_token',
      });
    });

    it('meters a broadcast by the number of subscribers in the environment', async () => {
      subscriberRepository.count.resolves(350);

      await run({ method: 'POST', path: '/v1/events/trigger/broadcast', body: { name: 'wf' } });

      expect(subscriberRepository.count.firstCall.args[0]).to.deep.equal({
        _environmentId: ENV_ID,
        _organizationId: KEYLESS_ORG_ID,
      });
      expect(triggerCapService.consume.firstCall.args).to.deep.equal([ENV_ID, 350]);
    });

    it('meters topic recipients by the number of subscriptions to those topics in one grouped query', async () => {
      topicSubscribersRepository.aggregate.resolves([{ _id: 'all', count: 500 }]);

      await run({
        method: 'POST',
        path: '/v1/events/trigger',
        body: { to: ['a', { type: 'Topic', topicKey: 'all' }, { type: 'Topic', topicKey: 'all' }] },
      });

      expect(topicSubscribersRepository.aggregate.calledOnce).to.equal(true);
      const [match] = topicSubscribersRepository.aggregate.firstCall.args[0] as Array<{
        $match?: Record<string, unknown>;
      }>;
      expect(String(match.$match?._environmentId)).to.equal(ENV_ID);
      expect(String(match.$match?._organizationId)).to.equal(KEYLESS_ORG_ID);
      expect(match.$match?.topicKey).to.deep.equal({ $in: ['all'] });
      expect(triggerCapService.consume.firstCall.args).to.deep.equal([ENV_ID, 501]);
    });

    it('charges a topic once per bulk event that targets it', async () => {
      topicSubscribersRepository.aggregate.resolves([{ _id: 'all', count: 100 }]);
      const topic = { type: 'Topic', topicKey: 'all' };

      await run({
        method: 'POST',
        path: '/v1/events/trigger/bulk',
        body: { events: Array.from({ length: 100 }, () => ({ to: topic })) },
      });

      expect(topicSubscribersRepository.aggregate.calledOnce).to.equal(true);
      expect(triggerCapService.consume.firstCall.args).to.deep.equal([ENV_ID, 10_000]);
    });

    it('queries the database once however many distinct topic keys a request names', async () => {
      topicSubscribersRepository.aggregate.resolves([]);
      const to = Array.from({ length: 1000 }, (_, index) => ({ type: 'Topic', topicKey: `topic-${index}` }));

      await run({ method: 'POST', path: '/v1/events/trigger', body: { to } });

      expect(topicSubscribersRepository.aggregate.calledOnce).to.equal(true);
      expect(topicSubscribersRepository.count.called).to.equal(false);
      expect(triggerCapService.consume.firstCall.args).to.deep.equal([ENV_ID, 0]);
    });

    it('rejects with keyless_unavailable when the cap cannot be checked', async () => {
      triggerCapService.consume.resolves({ allowed: false, cap: 200, unavailable: true });

      const error = await runExpectingError({ method: 'POST', path: '/v1/events/trigger', body: { to: 'a' } });

      expect(error.getStatus()).to.equal(503);
      expect(errorBody(error)).to.include({ statusCode: 503, code: 'keyless_unavailable' });
    });

    it('does not query topics for triggers without topic recipients', async () => {
      await run({ method: 'POST', path: '/v1/events/trigger', body: { to: ['a'] } });

      expect(topicSubscribersRepository.aggregate.called).to.equal(false);
    });

    it('does not meter non-trigger routes', async () => {
      await run({ method: 'POST', path: '/v1/subscribers' });

      expect(triggerCapService.consume.called).to.equal(false);
    });

    it('does not meter triggers from non-agent environments', async () => {
      environmentRepository.findOne.resolves(agentEnvironment({ name: 'Development' }) as never);

      await run({ method: 'POST', path: '/v1/events/trigger', body: { to: 'a' } });

      expect(triggerCapService.consume.called).to.equal(false);
    });
  });
});
