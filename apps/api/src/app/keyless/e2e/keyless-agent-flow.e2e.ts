import { CommunityUserRepository, NotificationTemplateRepository } from '@novu/dal';
import { WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import request from 'supertest';

import { KeylessAgentErrorCodeEnum } from '../keyless-agent-environment';
import { useKeylessOrganization } from './keyless-agent-test.helpers';

describe('Keyless agent environments - create, use and claim #novu-v2', () => {
  const notificationTemplateRepository = new NotificationTemplateRepository();
  let keylessOwner: UserSession;
  let restoreKeylessOrganization: () => void;
  let originalCreateCap: string | undefined;

  const api = () => request(`http://127.0.0.1:${process.env.PORT}`);

  before(async () => {
    keylessOwner = new UserSession();
    await keylessOwner.initialize();

    // EE test users are linked to Clerk without a stored email; the keyless user is resolved by email.
    await new CommunityUserRepository().update(
      { _id: keylessOwner.user._id },
      { $set: { email: keylessOwner.user.email } }
    );

    restoreKeylessOrganization = await useKeylessOrganization(keylessOwner);
    originalCreateCap = process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY;
    process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY = '100';
  });

  after(() => {
    restoreKeylessOrganization();
    if (originalCreateCap === undefined) {
      delete process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY;
    } else {
      process.env.KEYLESS_AGENT_ENV_CREATE_CAP_PER_IP_PER_DAY = originalCreateCap;
    }
  });

  it('moves the workflow into the claimer Development environment and revokes the keyless key', async () => {
    const created = await api()
      .post('/v1/keyless/environments')
      .set('X-Forwarded-For', `198.51.100.${Date.now() % 250}`)
      .send({ source: 'integration-e2e' });
    expect(created.status).to.equal(201, JSON.stringify(created.body));
    const { secretKey, claimUrl } = created.body.data;
    const authorization = `ApiKey ${secretKey}`;

    const workflow = await api()
      .post('/v2/workflows')
      .set('Authorization', authorization)
      .send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Order shipped',
        workflowId: 'order-shipped',
        steps: [{ name: 'In-App', type: 'in_app', controlValues: { body: 'Your order shipped' } }],
      });
    expect(workflow.status).to.equal(201, JSON.stringify(workflow.body));

    const trigger = await api()
      .post('/v1/events/trigger')
      .set('Authorization', authorization)
      .send({ name: 'order-shipped', to: { subscriberId: 'keyless-flow-user' }, payload: {} });
    expect(trigger.status).to.equal(201, JSON.stringify(trigger.body));

    const token = new URL(claimUrl).searchParams.get('token');
    expect(token).to.be.a('string');
    const claimer = new UserSession();
    await claimer.initialize();

    const claim = await claimer.testAgent.post('/v1/keyless/environments/claim').send({ token });
    expect(claim.status).to.equal(200, JSON.stringify(claim.body));
    expect(claim.body.data.kind).to.equal('agent-environment');
    expect(claim.body.data.environmentId).to.equal(claimer.environment._id);
    expect(claim.body.data.workflowIdentifiers).to.include('order-shipped');

    const copied = await notificationTemplateRepository.findOne({
      _environmentId: claimer.environment._id,
      'triggers.identifier': 'order-shipped',
    } as never);
    expect(copied?._organizationId).to.equal(claimer.organization._id);

    const me = await api().get('/v1/keyless/environments/me').set('Authorization', authorization);
    expect(me.status).to.equal(401, JSON.stringify(me.body));
    expect(me.body.code).to.equal(KeylessAgentErrorCodeEnum.ENVIRONMENT_CLAIMED);
  });
});
