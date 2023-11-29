import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { IWorkflowOverride } from '@novu/shared';
import { TenantRepository } from '@novu/dal';
import { WorkflowOverrideService } from '@novu/testing';

describe('Get workflow override - /workflow-overrides/workflows/:workflowId/tenants/:tenantIdentifier (GET)', async () => {
  let session: UserSession;
  const tenantRepository = new TenantRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return the workflow override', async function () {
    const workflowOverrideService = new WorkflowOverrideService({
      organizationId: session.organization._id,
      environmentId: session.environment._id,
    });
    const { workflowOverride } = await workflowOverrideService.createWorkflowOverride();

    const tenant = await tenantRepository.findOne({
      _environmentId: session.environment._id,
      _id: workflowOverride._tenantId,
    });

    if (!tenant) throw new Error('Tenant not found');

    const res = await session.testAgent.get(
      `/v1/workflow-overrides/workflows/${workflowOverride._workflowId}/tenants/${tenant._id}`
    );

    const foundWorkflowOverride: IWorkflowOverride = res.body.data;

    expect(foundWorkflowOverride._workflowId).to.equal(workflowOverride._workflowId);
    expect(foundWorkflowOverride._tenantId).to.equal(workflowOverride._tenantId);
    expect(foundWorkflowOverride.active).to.equal(workflowOverride.active);
    expect(foundWorkflowOverride.preferenceSettings.chat).to.equal(workflowOverride.preferenceSettings.chat);
    expect(foundWorkflowOverride.preferenceSettings.sms).to.equal(workflowOverride.preferenceSettings.sms);
    expect(foundWorkflowOverride.preferenceSettings.in_app).to.equal(workflowOverride.preferenceSettings.in_app);
    expect(foundWorkflowOverride.preferenceSettings.email).to.equal(workflowOverride.preferenceSettings.email);
    expect(foundWorkflowOverride.preferenceSettings.push).to.equal(workflowOverride.preferenceSettings.push);
  });
});
