import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { TenantRepository, WorkflowOverrideRepository } from '@novu/dal';
import { WorkflowOverrideService } from '@novu/testing';

describe('Delete workflow override - /workflow-overrides/:overrideId (Delete)', async () => {
  let session: UserSession;
  const tenantRepository = new TenantRepository();
  const workflowOverrideRepository = new WorkflowOverrideRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should delete the workflow override', async function () {
    const workflowOverrideService = new WorkflowOverrideService({
      organizationId: session.organization._id,
      environmentId: session.environment._id,
    });

    const { tenant, workflowOverride } = await workflowOverrideService.createWorkflowOverride();

    if (!tenant) throw new Error('Tenant not found');

    const validatedCreationWorkflowOverride = await workflowOverrideRepository.findOne({
      _environmentId: session.environment._id,
      _id: workflowOverride._id,
    });

    if (!validatedCreationWorkflowOverride) throw new Error('WorkflowOverride not found');

    expect(validatedCreationWorkflowOverride._id).to.be.ok;

    const deleteRes = await session.testAgent.delete(`/v1/workflow-overrides/${validatedCreationWorkflowOverride._id}`);

    const foundWorkflowOverride: boolean = deleteRes.body.data;

    expect(foundWorkflowOverride).to.equal(true);

    const findDeleted = await workflowOverrideRepository.findOne({
      _environmentId: session.environment._id,
      _id: workflowOverride._id,
    });

    expect(findDeleted).to.be.null;
  });

  it('should fail to delete non-existing workflow override', async function () {
    const fakeWorkflowOverrideId = session.user._id;
    const deleteRes = await session.testAgent.delete(`/v1/workflow-overrides/${fakeWorkflowOverrideId}`);

    const foundWorkflowOverride = deleteRes.body;

    expect(foundWorkflowOverride.statusCode).to.equal(404);
    expect(foundWorkflowOverride.message).to.equal(`Workflow Override with id ${fakeWorkflowOverrideId} not found`);
  });
});
