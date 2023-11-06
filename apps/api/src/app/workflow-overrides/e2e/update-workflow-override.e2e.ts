import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { ICreateWorkflowOverrideRequestDto, IUpdateWorkflowOverrideRequestDto } from '@novu/shared';
import { NotificationTemplateRepository, TenantRepository } from '@novu/dal';

describe('Update Workflow Override - /workflow-overrides/workflows/:workflowId/tenants/:tenantIdentifier (PUT)', function () {
  let session: UserSession;
  const tenantRepository = new TenantRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should successfully update workflow override', async function () {
    const { tenant, workflow, overrides } = await initializeOverrides();

    expect(overrides.preferenceSettings).to.deep.equal({
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });
    expect(overrides.active).to.equal(false);

    const updatePayload: IUpdateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: true, sms: false },
      active: true,
    };

    const updatedOverrides = (
      await session.testAgent
        .put(`/v1/workflow-overrides/workflows/${workflow._id}/tenants/${tenant.identifier}`)
        .send(updatePayload)
    ).body.data;

    expect(updatedOverrides.preferenceSettings).to.deep.equal({
      email: true,
      sms: false,
      in_app: true,
      chat: true,
      push: true,
    });
    expect(updatedOverrides.active).to.equal(true);
  });

  it('should fail update workflow override with invalid tenant identifier', async function () {
    const { tenant, workflow, overrides } = await initializeOverrides();

    expect(overrides.preferenceSettings).to.deep.equal({
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });
    expect(overrides.active).to.equal(false);

    const updatePayload: IUpdateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: true, sms: false },
      active: true,
    };

    const invalidTenantIdentifier = 'invalid-tenant-identifier';
    const updatedOverrides = (
      await session.testAgent
        .put(`/v1/workflow-overrides/workflows/${workflow._id}/tenants/${invalidTenantIdentifier}`)
        .send(updatePayload)
    ).body;

    expect(updatedOverrides.message).to.equal('Tenant with identifier invalid-tenant-identifier is not found');
    expect(updatedOverrides.statusCode).to.equal(404);
  });

  it('should fail update workflow override with invalid workflow id', async function () {
    const { tenant, workflow, overrides } = await initializeOverrides();

    expect(overrides.preferenceSettings).to.deep.equal({
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });
    expect(overrides.active).to.equal(false);

    const updatePayload: IUpdateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: true, sms: false },
      active: true,
    };

    const invalidWorkflowId = tenant._id;
    const updatedOverrides = (
      await session.testAgent
        .put(`/v1/workflow-overrides/workflows/${invalidWorkflowId}/tenants/${tenant.identifier}`)
        .send(updatePayload)
    ).body;

    expect(updatedOverrides.message).to.equal(`Workflow with _workflowId ${invalidWorkflowId} is not found`);
    expect(updatedOverrides.statusCode).to.equal(404);
  });

  it('should fail update workflow override with now existing workflow override', async function () {
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

    const updatePayload: IUpdateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: true, sms: false },
      active: true,
    };

    const updatedOverrides = (
      await session.testAgent
        .put(`/v1/workflow-overrides/workflows/${workflow._id}/tenants/${tenant.identifier}`)
        .send(updatePayload)
    ).body;

    expect(updatedOverrides.message).to.equal(
      `Workflow override with workflow id ${workflow._id} and tenant identifier ${tenant.identifier} was not found`
    );
    expect(updatedOverrides.statusCode).to.equal(404);
  });

  async function initializeOverrides() {
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
      triggerIdentifier: workflow.triggers[0].identifier,
      tenantIdentifier: tenant.identifier,
    };

    const overrides = (await session.testAgent.post('/v1/workflow-overrides').send(payload)).body.data;

    return { tenant, workflow, overrides };
  }
});
