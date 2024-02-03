import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { ICreateWorkflowOverrideRequestDto } from '@novu/shared';
import { NotificationTemplateRepository, TenantRepository } from '@novu/dal';

describe('Create Integration - /workflow-overrides (POST)', function () {
  let session: UserSession;
  const tenantRepository = new TenantRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should successfully create new workflow override', async function () {
    const tenant = await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    const workflow = await notificationTemplateRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      name: 'test api template',
      description: 'This is a test description',
      tags: ['test-tag-api'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
      triggers: [{ identifier: 'test-trigger-api' }],
    });

    const payload: ICreateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: false },
      active: false,
      workflowId: workflow._id,
      tenantId: tenant._id,
    };

    const res = await session.testAgent.post('/v1/workflow-overrides').send(payload);

    expect(res.status).to.equal(201);

    expect(res.body.data.active).to.equal(false);
    expect(res.body.data._workflowId).to.equal(workflow._id);
    expect(res.body.data._tenantId).to.equal(tenant._id);
    expect(res.body.data.preferenceSettings).to.deep.equal({
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });
    expect(res.body.data.deleted).to.equal(false);
    expect(res.body.data._environmentId).to.equal(session.environment._id);
    expect(res.body.data._organizationId).to.equal(session.organization._id);
  });

  it('should fail on creation of new workflow override with missing workflow id', async function () {
    const tenant = await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    const payload: ICreateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: false },
      active: false,
      tenantId: tenant._id,
      workflowId: undefined as any,
    };

    const res = await session.testAgent.post('/v1/workflow-overrides').send(payload);

    expect(res.body.statusCode).to.equal(400);
    expect(res.body.message[0]).to.equal('workflowId should not be null or undefined');
    expect(res.body.message[1]).to.equal('workflowId must be a string');
  });

  it('should fail on creation of new workflow override with missing tenant id', async function () {
    const workflow = await notificationTemplateRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      name: 'test api template',
      description: 'This is a test description',
      tags: ['test-tag-api'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
      triggers: [{ identifier: 'test-trigger-api' }],
    });

    const payload: ICreateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: false },
      active: false,
      workflowId: workflow._id,
      tenantId: 'fake-tenant-identifier',
    };

    const res = await session.testAgent.post('/v1/workflow-overrides').send(payload);

    expect(res.body.statusCode).to.equal(400);
    expect(res.body.message[0]).to.equal('_tenantId must be a mongodb id');
  });
});
