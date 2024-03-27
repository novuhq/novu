import { expect } from 'chai';

import { UserSession, WorkflowOverrideService } from '@novu/testing';
import { IUpdateWorkflowOverrideRequestDto } from '@novu/shared';

describe('Update Workflow Override By ID - /workflow-overrides/:overrideId (PUT)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should successfully update workflow override by ID', async function () {
    const workflowOverrideService = new WorkflowOverrideService({
      organizationId: session.organization._id,
      environmentId: session.environment._id,
    });

    const { workflowOverride } = await workflowOverrideService.createWorkflowOverride({
      preferenceSettings: {
        email: false,
        sms: true,
        in_app: true,
        chat: true,
        push: true,
      },
    });

    expect(workflowOverride.preferenceSettings).to.deep.equal({
      email: false,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });
    expect(workflowOverride.active).to.equal(false);

    const updatePayload: IUpdateWorkflowOverrideRequestDto = {
      preferenceSettings: { email: true, sms: false },
      active: true,
    };

    const updatedOverrides = (
      await session.testAgent.put(`/v1/workflow-overrides/${workflowOverride._id}`).send(updatePayload)
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
});
