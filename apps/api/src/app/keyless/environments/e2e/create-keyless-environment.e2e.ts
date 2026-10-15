import { CommunityUserRepository, EnvironmentRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import request from 'supertest';

import { KEYLESS_ENVIRONMENT_PREFIX, KEYLESS_WORKFLOW_IDENTIFIER } from '../../../inbox/utils';
import { useKeylessOrganization } from '../../e2e/keyless-agent-test.helpers';
import {
  hashApiKey,
  KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX,
  KeylessAgentErrorCodeEnum,
} from '../../keyless-agent-environment';

const CREATE_PATH = '/v1/keyless/environments';
const ENV_OVERRIDES = [
  'KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY',
  'NOVU_ENTERPRISE',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED,
];

describe('Keyless agent environments - create #novu-v2', () => {
  const environmentRepository = new EnvironmentRepository();
  let keylessOwner: UserSession;
  let restoreKeylessOrganization: () => void;
  let originalEnv: Record<string, string | undefined>;
  let ipCounter = 0;

  const api = () => request(`http://127.0.0.1:${process.env.PORT}`);
  const nextClientIp = () => {
    ipCounter += 1;

    return `203.0.113.${(Date.now() + ipCounter) % 250}`;
  };
  const createEnvironment = (body: Record<string, unknown> = {}, clientIp = nextClientIp()) =>
    api().post(CREATE_PATH).set('X-Forwarded-For', clientIp).send(body);

  before(async () => {
    keylessOwner = new UserSession();
    await keylessOwner.initialize();

    // EE test users are linked to Clerk without a stored email; the keyless user is resolved by email.
    await new CommunityUserRepository().update(
      { _id: keylessOwner.user._id },
      { $set: { email: keylessOwner.user.email } }
    );
  });

  beforeEach(async () => {
    originalEnv = Object.fromEntries(ENV_OVERRIDES.map((key) => [key, process.env[key]]));
    restoreKeylessOrganization = await useKeylessOrganization(keylessOwner);
    process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY = '100';
  });

  afterEach(() => {
    restoreKeylessOrganization();
    for (const key of ENV_OVERRIDES) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it('creates an agent environment in the keyless organization and returns its secret key once', async () => {
    const { status, body } = await createEnvironment({ source: ' Cursor ' });

    expect(status).to.equal(201, JSON.stringify(body));
    const { data } = body;
    expect(data).to.have.keys([
      'environmentId',
      'secretKey',
      'applicationIdentifier',
      'apiUrl',
      'claimUrl',
      'expiresAt',
    ]);
    expect(data.secretKey).to.match(/^sk_/);
    expect(data.applicationIdentifier.startsWith(KEYLESS_ENVIRONMENT_PREFIX)).to.be.false;
    expect(data.apiUrl).to.equal((process.env.API_ROOT_URL as string).replace(/\/+$/, ''));
    expect(data.claimUrl).to.match(/\/connect\/claim\?token=/);

    const environment = await environmentRepository.findOne({
      _id: data.environmentId,
      _organizationId: keylessOwner.organization._id,
    });
    expect(environment?.name.startsWith(KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX)).to.be.true;
    expect(environment?.apiKeys[0].hash).to.equal(hashApiKey(data.secretKey));

    const expectedExpiry = new Date(environment?.createdAt as string).getTime() + 72 * 60 * 60 * 1000;
    expect(new Date(data.expiresAt).getTime()).to.equal(expectedExpiry);
  });

  it('lets the secret key list workflows and trigger the seeded hello-world workflow', async () => {
    const { body } = await createEnvironment();
    const authorization = `ApiKey ${body.data.secretKey}`;

    const workflows = await api().get('/v2/workflows').set('Authorization', authorization);
    expect(workflows.status).to.equal(200, JSON.stringify(workflows.body));

    const trigger = await api()
      .post('/v1/events/trigger')
      .set('Authorization', authorization)
      .send({ name: KEYLESS_WORKFLOW_IDENTIFIER, to: { subscriberId: 'keyless-e2e-user' }, payload: {} });
    expect(trigger.status).to.equal(201, JSON.stringify(trigger.body));
  });

  it('returns the environment status and a claim URL from /me', async () => {
    const { body } = await createEnvironment();

    const me = await api().get(`${CREATE_PATH}/me`).set('Authorization', `ApiKey ${body.data.secretKey}`);

    expect(me.status).to.equal(200, JSON.stringify(me.body));
    expect(me.body.data).to.deep.include({
      environmentId: body.data.environmentId,
      applicationIdentifier: body.data.applicationIdentifier,
      status: 'active',
      expiresAt: body.data.expiresAt,
    });
    expect(me.body.data.claimUrl).to.match(/\/connect\/claim\?token=/);
  });

  it('returns 404 keyless_environment_not_found from /me for a regular environment key', async () => {
    const me = await api().get(`${CREATE_PATH}/me`).set('Authorization', `ApiKey ${keylessOwner.apiKey}`);

    expect(me.status).to.equal(404, JSON.stringify(me.body));
    expect(me.body.code).to.equal(KeylessAgentErrorCodeEnum.ENVIRONMENT_NOT_FOUND);
  });

  it('returns 404 keyless_disabled when the agent environments flag is off', async () => {
    process.env[FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_ENVIRONMENTS_ENABLED] = 'false';

    const { status, body } = await createEnvironment();

    expect(status).to.equal(404, JSON.stringify(body));
    expect(body.code).to.equal(KeylessAgentErrorCodeEnum.DISABLED);
  });

  it('returns 404 keyless_disabled when the keyless organization is not configured', async () => {
    delete process.env.KEYLESS_ORGANIZATION_ID;

    const { status, body } = await createEnvironment();

    expect(status).to.equal(404, JSON.stringify(body));
    expect(body.code).to.equal(KeylessAgentErrorCodeEnum.DISABLED);
  });

  it('returns 429 keyless_rate_limited once the per-IP daily cap is reached', async () => {
    process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY = '1';
    const clientIp = `198.51.100.${Date.now() % 250}`;

    expect((await createEnvironment({}, clientIp)).status).to.equal(201);
    const { status, body } = await createEnvironment({}, clientIp);

    expect(status).to.equal(429, JSON.stringify(body));
    expect(body.code).to.equal(KeylessAgentErrorCodeEnum.RATE_LIMITED);
  });

  it('rejects an invalid source', async () => {
    const { status } = await createEnvironment({ source: 'not a valid source!' });

    expect(status).to.be.oneOf([400, 422]);
  });

  it('keeps the inbox demo keyless session on pk_keyless_ identifiers', async () => {
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = 'managed-claude-test-key';
    process.env[FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED] = 'true';

    const { status, body } = await api().post('/v1/inbox/session').set('X-Forwarded-For', nextClientIp()).send({});

    expect(status).to.equal(201, JSON.stringify(body));
    expect(body.data.applicationIdentifier.startsWith(KEYLESS_ENVIRONMENT_PREFIX)).to.be.true;
  });
});
