import { randomBytes } from 'node:crypto';
import { CacheService } from '@novu/application-generic';
import {
  ControlValuesRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, EnvironmentTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { createAgentKeylessEnvironmentFixture, useKeylessOrganization } from '../../e2e/keyless-agent-test.helpers';
import { readKeylessAgentClaimedTombstone } from '../../keyless-agent-cache';
import { hashApiKey } from '../../keyless-agent-environment';

describe('Claim keyless environment - /v1/keyless/environments/claim (POST) #novu-v2', () => {
  const environmentRepository = new EnvironmentRepository();
  const integrationRepository = new IntegrationRepository();
  const subscriberRepository = new SubscriberRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const controlValuesRepository = new ControlValuesRepository();

  let keylessOwner: UserSession;
  let restoreKeylessOrganization: () => void;
  let keylessEnvironment: EnvironmentEntity;
  let secretKey: string;

  before(async () => {
    keylessOwner = new UserSession();
    await keylessOwner.initialize();
    restoreKeylessOrganization = await useKeylessOrganization(keylessOwner);
  });

  after(() => {
    restoreKeylessOrganization();
  });

  beforeEach(async () => {
    ({ environment: keylessEnvironment, secretKey } = await createAgentKeylessEnvironmentFixture(testServer, {
      organizationId: keylessOwner.organization._id,
      userId: keylessOwner.user._id,
    }));
  });

  function withKeylessKey(method: 'post' | 'get', path: string) {
    return keylessOwner.testAgent[method](path).set('Authorization', `ApiKey ${secretKey}`);
  }

  async function createWorkflow(
    request: ReturnType<UserSession['testAgent']['post']>,
    workflowId: string,
    body = 'Your order shipped'
  ) {
    const res = await request.send({
      __source: WorkflowCreationSourceEnum.Editor,
      name: workflowId,
      workflowId,
      steps: [{ name: 'In-App', type: 'in_app', controlValues: { body } }],
    });
    expect(res.status).to.equal(201, JSON.stringify(res.body));
  }

  async function issueClaimToken(environment: EnvironmentEntity): Promise<string> {
    const { token } = await testServer.getService(ConnectClaimTokenService).issueOrGetForEnvironment({
      env: environment._id,
      org: environment._organizationId,
    });

    return token;
  }

  async function newClaimer(): Promise<UserSession> {
    const claimer = new UserSession();
    await claimer.initialize();

    return claimer;
  }

  function countNovuEmail(environmentId: string): Promise<number> {
    return integrationRepository.count({
      _environmentId: environmentId,
      channel: ChannelTypeEnum.EMAIL,
      providerId: EmailProviderIdEnum.Novu,
    } as never);
  }

  it('copies the workflows, moves subscribers, keeps one Novu Email and revokes the keyless key', async () => {
    await createWorkflow(withKeylessKey('post', '/v2/workflows'), 'order-shipped');
    const subscriberRes = await withKeylessKey('post', '/v2/subscribers').send({ subscriberId: 'user-1' });
    expect(subscriberRes.status).to.equal(201, JSON.stringify(subscriberRes.body));
    const token = await issueClaimToken(keylessEnvironment);
    const claimer = await newClaimer();
    const keylessNovuEmails = await countNovuEmail(keylessEnvironment._id);
    const targetNovuEmailsBefore = await countNovuEmail(claimer.environment._id);

    const res = await claimer.testAgent.post('/v1/keyless/environments/claim').send({ token });

    expect(res.status).to.equal(200, JSON.stringify(res.body));
    expect(res.body.data).to.deep.equal({
      kind: 'agent-environment',
      environmentId: claimer.environment._id,
      workflowIdentifiers: ['order-shipped'],
      skippedWorkflowIdentifiers: [],
    });

    const copied = await notificationTemplateRepository.findOne({
      _environmentId: claimer.environment._id,
      'triggers.identifier': 'order-shipped',
    } as never);
    expect(copied?._organizationId).to.equal(claimer.organization._id);
    expect(copied?.steps).to.have.length(1);
    const controlValues = await controlValuesRepository.find({
      _environmentId: claimer.environment._id,
      _organizationId: claimer.organization._id,
      _workflowId: copied?._id,
    });
    expect(controlValues.map((value) => value.controls?.body)).to.include('Your order shipped');
    expect(
      await notificationTemplateRepository.count({
        _environmentId: keylessEnvironment._id,
        'triggers.identifier': 'order-shipped',
      } as never)
    ).to.equal(1);

    const subscriber = await subscriberRepository.findBySubscriberId(claimer.environment._id, 'user-1');
    expect(subscriber?._organizationId).to.equal(claimer.organization._id);

    expect(await countNovuEmail(claimer.environment._id)).to.equal(
      Math.min(1, keylessNovuEmails + targetNovuEmailsBefore)
    );

    const revoked = await environmentRepository.findOne({
      _id: keylessEnvironment._id,
      _organizationId: keylessOwner.organization._id,
    });
    expect(revoked?.apiKeys).to.have.length(1);
    expect(revoked?.apiKeys[0].hash).to.not.equal(hashApiKey(secretKey));
    expect(await environmentRepository.findByApiKey({ hash: hashApiKey(secretKey) })).to.equal(null);
    const tombstone = await readKeylessAgentClaimedTombstone(
      testServer.getService(CacheService),
      hashApiKey(secretKey)
    );
    expect(tombstone).to.include({
      environmentId: keylessEnvironment._id,
      organizationId: keylessOwner.organization._id,
    });

    const reuse = await claimer.testAgent.post('/v1/keyless/environments/claim').send({ token });
    expect(reuse.status).to.equal(400, JSON.stringify(reuse.body));
    expect(reuse.body.code).to.equal('claim_link_used');
  });

  it('refuses a claimer that already has a workflow with the same identifier and changes nothing', async () => {
    await createWorkflow(withKeylessKey('post', '/v2/workflows'), 'order-shipped');
    await withKeylessKey('post', '/v2/subscribers').send({ subscriberId: 'user-2' });
    const token = await issueClaimToken(keylessEnvironment);
    const claimer = await newClaimer();
    await createWorkflow(claimer.testAgent.post('/v2/workflows'), 'order-shipped', 'Mine');

    const res = await claimer.testAgent.post('/v1/keyless/environments/claim').send({ token });

    expect(res.status).to.equal(409, JSON.stringify(res.body));
    expect(res.body.code).to.equal('claim_workflow_exists');
    expect(res.body.workflowIdentifiers).to.deep.equal(['order-shipped']);
    expect(res.body.message).to.include('order-shipped');

    const untouched = await environmentRepository.findOne({
      _id: keylessEnvironment._id,
      _organizationId: keylessOwner.organization._id,
    });
    expect(untouched?.apiKeys).to.have.length(1);
    expect(await subscriberRepository.findBySubscriberId(keylessEnvironment._id, 'user-2')).to.not.equal(null);
    expect(
      await notificationTemplateRepository.count({
        _environmentId: claimer.environment._id,
        'triggers.identifier': 'order-shipped',
      } as never)
    ).to.equal(1);
    expect(await testServer.getService(ConnectClaimTokenService).verify(token)).to.include({
      env: keylessEnvironment._id,
    });
  });

  it('skips hello-world when the claimer already has one', async () => {
    await createWorkflow(withKeylessKey('post', '/v2/workflows'), 'hello-world', 'Keyless hello');
    await createWorkflow(withKeylessKey('post', '/v2/workflows'), 'order-shipped');
    const token = await issueClaimToken(keylessEnvironment);
    const claimer = await newClaimer();
    await createWorkflow(claimer.testAgent.post('/v2/workflows'), 'hello-world', 'My hello');

    const res = await claimer.testAgent.post('/v1/keyless/environments/claim').send({ token });

    expect(res.status).to.equal(200, JSON.stringify(res.body));
    expect(res.body.data.workflowIdentifiers).to.deep.equal(['order-shipped']);
    expect(res.body.data.skippedWorkflowIdentifiers).to.deep.equal(['hello-world']);
    expect(
      await notificationTemplateRepository.count({
        _environmentId: claimer.environment._id,
        'triggers.identifier': 'hello-world',
      } as never)
    ).to.equal(1);
  });

  it('claims a keyless connect environment exactly like /v1/connect/claim', async () => {
    const connectEnvironment = await environmentRepository.create({
      _organizationId: keylessOwner.organization._id,
      name: 'Keyless',
      identifier: `pk_keyless_${randomBytes(8).toString('hex')}_${Date.now()}`,
      type: EnvironmentTypeEnum.DEV,
      apiKeys: [{ key: 'encrypted', _userId: keylessOwner.user._id, hash: `hash_${randomBytes(8).toString('hex')}` }],
    });
    await subscriberRepository.create({
      _environmentId: connectEnvironment._id,
      _organizationId: keylessOwner.organization._id,
      subscriberId: 'connect-user',
    });
    const token = await issueClaimToken(connectEnvironment);
    const claimer = await newClaimer();

    const res = await claimer.testAgent.post('/v1/keyless/environments/claim').send({ token });

    expect(res.status).to.equal(200, JSON.stringify(res.body));
    expect(res.body.data).to.deep.equal({
      kind: 'connect',
      environmentId: claimer.environment._id,
      workflowIdentifiers: [],
      skippedWorkflowIdentifiers: [],
    });
    expect(await subscriberRepository.findBySubscriberId(claimer.environment._id, 'connect-user')).to.not.equal(null);
    const after = await environmentRepository.findOne({
      _id: connectEnvironment._id,
      _organizationId: keylessOwner.organization._id,
    });
    expect(after?.apiKeys).to.have.length(1);
  });

  it('refuses to claim into the keyless organization', async () => {
    const token = await issueClaimToken(keylessEnvironment);

    const res = await keylessOwner.testAgent.post('/v1/keyless/environments/claim').send({ token });

    expect(res.status).to.equal(400, JSON.stringify(res.body));
    expect(res.body.code).to.equal('claim_into_keyless_org');
  });
});
