import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PinoLogger } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { ACCESS_LOG_MESSAGE, accessLogMiddleware, buildAccessLog } from './access-log.middleware';

const newrelic = require('newrelic');

const API_KEY = '0123456789abcdef0123456789abc4f2';
const SESSION_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.payload.signature';
const MEASURED = { clientIp: '203.0.113.7', responseTime: 12 };

const USER_SESSION = {
  _id: 'user-id',
  organizationId: 'org-id',
  environmentId: 'env-id',
  scheme: 'Bearer',
  email: 'someone@example.com',
};

type RequestParts = {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  routePath?: string;
  authScheme?: string;
  user?: Record<string, unknown>;
};

function buildRequest({
  method = 'GET',
  url = '/v1/environments/env-id/api-keys?token=query-secret',
  headers = {},
  routePath,
  authScheme,
  user,
}: RequestParts = {}) {
  return {
    method,
    url,
    originalUrl: url,
    headers,
    socket: { remoteAddress: '10.0.0.5' },
    route: routePath === undefined ? undefined : { path: routePath },
    authScheme,
    user,
  } as unknown as IncomingMessage;
}

function buildResponse({ statusCode = 200, writableEnded = true } = {}) {
  return Object.assign(new EventEmitter(), { statusCode, writableEnded }) as unknown as ServerResponse;
}

describe('buildAccessLog', () => {
  it('says who called which route, from where, and how it ended', () => {
    const req = buildRequest({
      headers: {
        authorization: `Bearer ${SESSION_TOKEN}`,
        'cf-ray': '8f1a2b3c4d5e6f70-FRA',
        'cf-ipcountry': 'DE',
        'user-agent': 'Mozilla/5.0',
        origin: 'https://dashboard.novu.co',
        'idempotency-key': 'evt_01h8x',
        'sentry-trace': 'a1b2c3d4e5f60718293a4b5c6d7e8f90-1234567890abcdef-1',
        'x-amzn-trace-id': 'Root=1-67891233-abcdef012345678912345678',
      },
      routePath: '/v1/environments/:environmentId/api-keys',
      authScheme: 'Bearer',
      user: USER_SESSION,
    });

    expect(buildAccessLog(req, buildResponse(), MEASURED)).to.deep.equal({
      method: 'GET',
      route: '/v1/environments/:environmentId/api-keys',
      statusCode: 200,
      responseTime: 12,
      aborted: undefined,
      clientIp: '203.0.113.7',
      cfRay: '8f1a2b3c4d5e6f70-FRA',
      country: 'DE',
      userAgent: 'Mozilla/5.0',
      origin: 'https://dashboard.novu.co',
      idempotencyKey: 'evt_01h8x',
      sentryTrace: 'a1b2c3d4e5f60718293a4b5c6d7e8f90-1234567890abcdef-1',
      amznTraceId: 'Root=1-67891233-abcdef012345678912345678',
      authScheme: 'Bearer',
      organizationId: 'org-id',
      environmentId: 'env-id',
      userId: 'user-id',
      apiKeyLast4: undefined,
    });
  });

  it('identifies a secret key by its last four characters', () => {
    const req = buildRequest({
      headers: { authorization: `ApiKey ${API_KEY}` },
      authScheme: 'ApiKey',
      user: { ...USER_SESSION, scheme: 'ApiKey' },
    });

    expect(buildAccessLog(req, buildResponse(), MEASURED)).to.include({ authScheme: 'ApiKey', apiKeyLast4: 'c4f2' });
  });

  it('identifies a rejected secret key too', () => {
    const req = buildRequest({ headers: { authorization: `ApiKey ${API_KEY}` }, authScheme: 'ApiKey' });
    const line = buildAccessLog(req, buildResponse({ statusCode: 401 }), MEASURED);

    expect(line).to.include({ statusCode: 401, apiKeyLast4: 'c4f2' });
    expect(line.organizationId).to.equal(undefined);
  });

  it('leaves out the ending of a value too short to be a secret key', () => {
    const req = buildRequest({ headers: { authorization: 'ApiKey hunter2' }, authScheme: 'ApiKey' });

    expect(buildAccessLog(req, buildResponse(), MEASURED).apiKeyLast4).to.equal(undefined);
  });

  it('never logs a secret key sent without the ApiKey prefix', () => {
    // The guards keep the first word of the header as the scheme, which here is the key itself.
    const req = buildRequest({ headers: { authorization: API_KEY }, authScheme: API_KEY });
    const line = buildAccessLog(req, buildResponse({ statusCode: 401 }), MEASURED);

    expect(line.authScheme).to.equal('unknown');
    expect(JSON.stringify(line)).not.to.include(API_KEY);
  });

  it('keeps the scheme of a request that sent no credentials', () => {
    const req = buildRequest({ authScheme: 'None' });

    expect(buildAccessLog(req, buildResponse({ statusCode: 401 }), MEASURED).authScheme).to.equal('None');
  });

  it('falls back to the scheme of the session on routes without the user auth guard', () => {
    const req = buildRequest({ user: USER_SESSION });

    expect(buildAccessLog(req, buildResponse(), MEASURED).authScheme).to.equal('Bearer');
  });

  it('does not log the subscriber of an Inbox session as the user', () => {
    const req = buildRequest({
      user: { ...USER_SESSION, _id: 'subscriber-internal-id', subscriberId: 'subscriber-1' },
    });
    const line = buildAccessLog(req, buildResponse(), MEASURED);

    expect(line).to.include({ organizationId: 'org-id', environmentId: 'env-id' });
    expect(line.userId).to.equal(undefined);
    expect(JSON.stringify(line)).not.to.include('subscriber');
  });

  it('leaves out an empty environment', () => {
    const req = buildRequest({ user: { ...USER_SESSION, environmentId: '' } });

    expect(buildAccessLog(req, buildResponse(), MEASURED).environmentId).to.equal(undefined);
  });

  it('logs the route pattern without an API context path, never the path that was called', () => {
    const req = buildRequest({ routePath: '/api/v1/environments/:environmentId/api-keys' });
    const line = buildAccessLog(req, buildResponse(), MEASURED);

    expect(line.route).to.equal('/v1/environments/:environmentId/api-keys');
    expect(JSON.stringify(line)).not.to.include('env-id');
  });

  it('keeps tokens, cookies, the query string and the session out of the line', () => {
    const req = buildRequest({
      headers: {
        authorization: `Bearer ${SESSION_TOKEN}`,
        cookie: '__session=cookie-secret',
        'x-agent-inbox-dashboard-secret': 'header-secret',
        'novu-signature': 'signature-secret',
      },
      routePath: '/v1/environments/:environmentId/api-keys',
      authScheme: 'Bearer',
      user: USER_SESSION,
    });
    const line = JSON.stringify(buildAccessLog(req, buildResponse(), MEASURED));

    for (const secret of [
      SESSION_TOKEN,
      'cookie-secret',
      'header-secret',
      'signature-secret',
      'query-secret',
      'someone@example.com',
    ]) {
      expect(line, secret).not.to.include(secret);
    }
  });

  it('cuts a long header value short', () => {
    const req = buildRequest({
      headers: {
        'user-agent': 'a'.repeat(1000),
        origin: 'b'.repeat(1000),
        'idempotency-key': 'c'.repeat(1000),
        'sentry-trace': 'd'.repeat(1000),
        'x-amzn-trace-id': 'e'.repeat(1000),
        'cf-ipcountry': 'f'.repeat(1000),
      },
    });
    const line = buildAccessLog(req, buildResponse(), MEASURED);

    expect(line.userAgent).to.have.length(256);
    expect(line.origin).to.have.length(256);
    expect(line.idempotencyKey).to.have.length(256);
    expect(line.sentryTrace).to.have.length(256);
    expect(line.amznTraceId).to.have.length(256);
    expect(line.country).to.have.length(256);
  });

  it('marks a request the caller hung up on', () => {
    const line = buildAccessLog(buildRequest(), buildResponse({ writableEnded: false }), MEASURED);

    expect(line.aborted).to.equal(true);
  });
});

describe('accessLogMiddleware', () => {
  const originalEnv = {
    IS_API_ACCESS_LOG_ENABLED: process.env.IS_API_ACCESS_LOG_ENABLED,
    CLIENT_IP_HEADER: process.env.CLIENT_IP_HEADER,
  };
  // nestjs-pino sets the root logger when the logger module starts, which no unit spec does.
  const rootLoggerHolder = PinoLogger as unknown as { root: unknown };
  const originalRootLogger = rootLoggerHolder.root;
  let info: sinon.SinonStub;
  let addCustomAttributes: sinon.SinonStub;

  beforeEach(() => {
    delete process.env.IS_API_ACCESS_LOG_ENABLED;
    process.env.CLIENT_IP_HEADER = 'cf-connecting-ip';
    info = sinon.stub();
    rootLoggerHolder.root = { info };
    addCustomAttributes = sinon.stub(newrelic, 'addCustomAttributes');
  });

  afterEach(() => {
    sinon.restore();
    rootLoggerHolder.root = originalRootLogger;

    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  function handle(req: IncomingMessage, res: ServerResponse = buildResponse()) {
    const next = sinon.stub();

    accessLogMiddleware(req, res, next);
    expect(next.calledOnce).to.equal(true);

    // The guards and the router fill these in after the middleware ran.
    return {
      close(routePath?: string, statusCode = 200) {
        Object.assign(req, { route: routePath === undefined ? undefined : { path: routePath } });
        Object.assign(res, { statusCode });
        res.emit('close');
      },
    };
  }

  it('writes one line on the root logger when the response closes', () => {
    const request = handle(buildRequest({ user: USER_SESSION }));

    expect(info.called).to.equal(false);

    request.close('/v1/environments');

    expect(info.calledOnce).to.equal(true);
    expect(info.firstCall.args[0]).to.include({ route: '/v1/environments', statusCode: 200, organizationId: 'org-id' });
    expect(info.firstCall.args[1]).to.equal(ACCESS_LOG_MESSAGE);
  });

  it('logs the IP it read when the request arrived', () => {
    const req = buildRequest({ headers: { 'cf-connecting-ip': '203.0.113.7' } });
    const request = handle(req);

    req.headers['cf-connecting-ip'] = '198.51.100.9';
    request.close('/v1/environments');

    expect(info.firstCall.args[0].clientIp).to.equal('203.0.113.7');
  });

  it('writes a line for a request that matched no route', () => {
    handle(buildRequest()).close(undefined, 404);

    expect(info.firstCall.args[0]).to.include({ statusCode: 404 });
  });

  for (const [method, routePath] of [
    ['POST', '/v1/internal/subscriber-online-state'],
    ['POST', '/v1/events/trigger'],
    ['POST', '/v1/events/trigger/bulk'],
    ['POST', '/api/v1/events/trigger'],
    ['POST', '/v1/environments/:environmentId/bridge'],
    ['GET', '/v1/inbox/notifications'],
    ['POST', '/v1/widgets/session/initialize'],
  ]) {
    it(`writes no line for ${method} ${routePath}`, () => {
      handle(buildRequest({ method, user: USER_SESSION })).close(routePath);

      expect(info.called).to.equal(false);
    });
  }

  for (const [method, routePath] of [
    ['DELETE', '/v1/events/trigger/:transactionId'],
    ['POST', '/v1/events/trigger/broadcast'],
    ['GET', '/v1/inbox-settings'],
  ]) {
    it(`writes a line for ${method} ${routePath}`, () => {
      handle(buildRequest({ method, user: USER_SESSION })).close(routePath);

      expect(info.calledOnce).to.equal(true);
    });
  }

  for (const [method, url] of [
    ['GET', '/v1/health-check'],
    ['HEAD', '/v1/health-check'],
    ['GET', '/api/v1/health-check/?probe=uptime'],
  ]) {
    it(`leaves the health check ${method} ${url} alone`, () => {
      handle(buildRequest({ method, url })).close('/v1/health-check');

      expect(info.called).to.equal(false);
      expect(addCustomAttributes.called).to.equal(false);
    });
  }

  it('writes a line for a POST to the health-check path, which no route answers', () => {
    handle(buildRequest({ method: 'POST', url: '/v1/health-check' })).close(undefined, 404);

    expect(info.calledOnce).to.equal(true);
  });

  for (const value of ['false', 'f', 'no', 'off', '0']) {
    it(`writes no line when IS_API_ACCESS_LOG_ENABLED is ${value}`, () => {
      process.env.IS_API_ACCESS_LOG_ENABLED = value;

      handle(buildRequest({ user: USER_SESSION })).close('/v1/environments');

      expect(info.called).to.equal(false);
    });
  }

  it('writes a line when IS_API_ACCESS_LOG_ENABLED is true', () => {
    process.env.IS_API_ACCESS_LOG_ENABLED = 'true';

    handle(buildRequest({ user: USER_SESSION })).close('/v1/environments');

    expect(info.calledOnce).to.equal(true);
  });

  it('adds the caller to the New Relic transaction of a request without a line, whatever the flag says', () => {
    process.env.IS_API_ACCESS_LOG_ENABLED = 'false';

    handle(
      buildRequest({
        headers: { authorization: `ApiKey ${API_KEY}`, 'cf-connecting-ip': '203.0.113.7', 'cf-ipcountry': 'DE' },
      })
    ).close('/v1/events/trigger');

    expect(
      addCustomAttributes.calledOnceWithExactly({ clientIp: '203.0.113.7', country: 'DE', apiKeyLast4: 'c4f2' })
    ).to.equal(true);
  });

  it('adds only what it knows to the New Relic transaction', () => {
    handle(buildRequest());

    expect(addCustomAttributes.calledOnceWithExactly({ clientIp: '10.0.0.5' })).to.equal(true);
  });

  it('survives a logger that throws', () => {
    info.throws(new Error('logger down'));

    expect(() => handle(buildRequest({ user: USER_SESSION })).close('/v1/environments')).not.to.throw();
  });
});
