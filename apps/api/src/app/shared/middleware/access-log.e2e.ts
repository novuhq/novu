import { randomUUID } from 'node:crypto';
import { HttpRequestHeaderKeysEnum, PinoLogger } from '@novu/application-generic';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ACCESS_LOG_MESSAGE } from './access-log.middleware';

describe('Access log #novu-v2', () => {
  let session: UserSession;
  let info: sinon.SinonStub;
  let userAgent: string;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  beforeEach(() => {
    info = sinon.stub(PinoLogger.root, 'info');
    // Marks the calls of one test, because a line is written after its response reached the caller.
    userAgent = `access-log-e2e-${randomUUID()}`;
  });

  afterEach(() => {
    info.restore();
  });

  /** The lines of this test once `count` of them are in. */
  async function accessLines(count: number): Promise<Record<string, unknown>[]> {
    const ownLines = () =>
      info
        .getCalls()
        .filter((logCall) => logCall.args[1] === ACCESS_LOG_MESSAGE && logCall.args[0].userAgent === userAgent)
        .map((logCall) => logCall.args[0]);

    for (let attempt = 0; attempt < 400 && ownLines().length < count; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    return ownLines();
  }

  it('records a dashboard read with the organization, environment and user', async () => {
    const response = await session.testAgent
      .get('/v1/environments')
      .set(HttpRequestHeaderKeysEnum.USER_AGENT, userAgent);
    const lines = await accessLines(1);

    expect(response.statusCode).to.equal(200);
    expect(lines).to.have.length(1);
    expect(lines[0]).to.include({
      method: 'GET',
      route: '/v1/environments',
      statusCode: 200,
      authScheme: ApiAuthSchemeEnum.BEARER,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    });
    expect(JSON.stringify(lines[0])).not.to.include(session.token.split(' ')[1]);
  });

  it('records which secret key made a call', async () => {
    const response = await session.testAgent
      .get('/v1/integrations')
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, `${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`)
      .set(HttpRequestHeaderKeysEnum.USER_AGENT, userAgent);
    const [line] = await accessLines(1);

    expect(response.statusCode).to.equal(200);
    expect(line).to.include({
      route: '/v1/integrations',
      authScheme: ApiAuthSchemeEnum.API_KEY,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      apiKeyLast4: session.apiKey.slice(-4),
    });
    expect(JSON.stringify(line)).not.to.include(session.apiKey);
  });

  it('records a call without credentials', async () => {
    const response = await session.testAgent
      .get('/v1/environments')
      .unset(HttpRequestHeaderKeysEnum.AUTHORIZATION)
      .set(HttpRequestHeaderKeysEnum.USER_AGENT, userAgent);
    const [line] = await accessLines(1);

    expect(response.statusCode).to.equal(401);
    expect(line).to.include({ route: '/v1/environments', statusCode: 401, authScheme: 'None' });
    expect(line.organizationId).to.equal(undefined);
  });

  it('never records a secret key sent without the ApiKey prefix', async () => {
    const response = await session.testAgent
      .get('/v1/environments')
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, session.apiKey)
      .set(HttpRequestHeaderKeysEnum.USER_AGENT, userAgent);
    const [line] = await accessLines(1);

    expect(response.statusCode).to.equal(401);
    expect(line).to.include({ statusCode: 401, authScheme: 'unknown' });
    expect(JSON.stringify(line)).not.to.include(session.apiKey);
  });

  it("records no line for a trigger call or the worker's bridge call", async () => {
    await session.testAgent
      .post('/v1/events/trigger')
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, `${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`)
      .set(HttpRequestHeaderKeysEnum.USER_AGENT, userAgent)
      .send({ name: 'workflow-that-does-not-exist', to: 'subscriber-1', payload: {} });
    await session.testAgent
      .post(`/v1/environments/${session.environment._id}/bridge?action=execute`)
      .set(HttpRequestHeaderKeysEnum.USER_AGENT, userAgent)
      .send({});
    // Responses close in order, so once this line is in, the calls above have had their turn.
    await session.testAgent.get('/v1/environments').set(HttpRequestHeaderKeysEnum.USER_AGENT, userAgent);
    const lines = await accessLines(1);

    expect(lines.map((line) => line.route)).to.deep.equal(['/v1/environments']);
  });
});
