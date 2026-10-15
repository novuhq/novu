import { CacheService } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import request from 'supertest';

import { writeKeylessAgentClaimedTombstone } from '../keyless-agent-cache';
import { hashApiKey } from '../keyless-agent-environment';
import { createAgentKeylessEnvironmentFixture, useKeylessOrganization } from './keyless-agent-test.helpers';

describe('Keyless API key scope #novu-v2', () => {
  const environmentRepository = new EnvironmentRepository();
  let keylessOwner: UserSession;
  let restoreKeylessOrganization: () => void;
  let originalRetention: string | undefined;

  before(async () => {
    keylessOwner = new UserSession();
    await keylessOwner.initialize();
    restoreKeylessOrganization = await useKeylessOrganization(keylessOwner);
    originalRetention = process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;
  });

  after(() => {
    restoreKeylessOrganization();
  });

  afterEach(() => {
    if (originalRetention === undefined) {
      delete process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS;
    } else {
      process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = originalRetention;
    }
  });

  async function createFixture() {
    return createAgentKeylessEnvironmentFixture(testServer, {
      organizationId: keylessOwner.organization._id,
      userId: keylessOwner.user._id,
    });
  }

  function withKey(secretKey: string) {
    const agent = request(keylessOwner.serverUrl);

    return {
      get: (path: string) => agent.get(path).set('Authorization', `ApiKey ${secretKey}`),
      post: (path: string, body: object) => agent.post(path).set('Authorization', `ApiKey ${secretKey}`).send(body),
    };
  }

  it('allows the agent loop: create a workflow, trigger it, read the current environment', async () => {
    const { secretKey } = await createFixture();
    const api = withKey(secretKey);

    const workflow = await api.post('/v2/workflows', {
      name: 'Order shipped',
      workflowId: 'order-shipped',
      steps: [{ name: 'In-App', type: 'in_app', controlValues: { body: 'Your order shipped' } }],
    });
    expect(workflow.status).to.equal(201, JSON.stringify(workflow.body));

    const trigger = await api.post('/v1/events/trigger', { name: 'order-shipped', to: { subscriberId: 'user-1' } });
    expect(trigger.status).to.equal(201, JSON.stringify(trigger.body));

    const me = await api.get('/v1/environments/me');
    expect(me.status).to.equal(200, JSON.stringify(me.body));

    const subscribers = await api.get('/v2/subscribers');
    expect(subscribers.status).to.equal(200, JSON.stringify(subscribers.body));
  });

  it('rejects org-level routes with keyless_requires_account and a claim URL', async () => {
    const { secretKey } = await createFixture();
    const api = withKey(secretKey);

    const environments = await api.get('/v1/environments');
    expect(environments.status).to.equal(403, JSON.stringify(environments.body));
    expect(environments.body.code).to.equal('keyless_requires_account');
    expect(environments.body.claimUrl).to.match(/\/connect\/claim\?token=/);

    const user = await api.get('/v1/users/me');
    expect(user.status).to.equal(403, JSON.stringify(user.body));
    expect(user.body.code).to.equal('keyless_requires_account');

    const uppercase = await api.get('/V1/ENVIRONMENTS');
    expect(uppercase.status).to.not.equal(200, JSON.stringify(uppercase.body));
  });

  it('rejects an expired agent environment with keyless_environment_expired', async () => {
    const { secretKey } = await createFixture();
    process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '0';

    const response = await withKey(secretKey).get('/v2/workflows');

    expect(response.status).to.equal(401, JSON.stringify(response.body));
    expect(response.body.code).to.equal('keyless_environment_expired');
  });

  it('rejects a key removed from its environment, with keyless_environment_claimed once tombstoned', async () => {
    const { environment, secretKey } = await createFixture();
    const api = withKey(secretKey);
    expect((await api.get('/v2/workflows')).status).to.equal(200);

    await environmentRepository.update(
      { _id: environment._id, _organizationId: environment._organizationId },
      { $set: { apiKeys: [] } }
    );
    const revoked = await api.get('/v2/workflows');
    expect(revoked.status).to.equal(401, JSON.stringify(revoked.body));

    await writeKeylessAgentClaimedTombstone(testServer.getService(CacheService), hashApiKey(secretKey), {
      environmentId: environment._id,
      organizationId: environment._organizationId,
      claimedAt: new Date().toISOString(),
    });
    const claimed = await api.get('/v2/workflows');

    expect(claimed.status).to.equal(401, JSON.stringify(claimed.body));
    expect(claimed.body.code).to.equal('keyless_environment_claimed');
  });

  it('leaves API keys of regular organizations unscoped', async () => {
    const regular = new UserSession();
    await regular.initialize();

    const response = await request(regular.serverUrl)
      .get('/v1/environments')
      .set('Authorization', `ApiKey ${regular.apiKey}`);

    expect(response.status).to.equal(200, JSON.stringify(response.body));
  });
});
