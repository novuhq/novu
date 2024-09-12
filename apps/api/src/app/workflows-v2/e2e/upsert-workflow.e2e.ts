import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { StepTypeEnum } from '@novu/shared';

import { WorkflowDto } from '../dto/workflow.dto';

describe('Upsert Workflow - /workflows (POST)', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create a new workflow', async () => {
    const workflowPayload: Partial<WorkflowDto> = {
      name: 'Test Workflow',
      description: 'This is a test workflow',
      active: true,
      critical: false,
      tags: ['test'],
      workflowId: 'test-workflow-id',
      notificationGroupId: session.notificationGroups[0]._id,
      preferences: {
        email: true,
        sms: false,
        in_app: true,
        chat: false,
        push: false,
      },
      code: 'TEST_WORKFLOW',
      steps: [
        {
          name: 'Email Step',
          code: 'email-step',
          stepId: 'email-step',
          type: StepTypeEnum.EMAIL,
        },
        {
          name: 'In-App Step',
          code: 'in-app-step',
          stepId: 'in-app-step',
          type: StepTypeEnum.IN_APP,
        },
      ],
    };

    const { body } = await session.testAgent.post('/v2/workflows').send(workflowPayload);

    expect(body.data).to.be.ok;
    const createdWorkflow = body.data;
    expect(createdWorkflow.preferenceSettings).to.deep.equal({
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });
    expect(createdWorkflow.name).to.equal('test-workflow-id');
    expect(createdWorkflow.description).to.equal('This is a test workflow');
    expect(createdWorkflow.active).to.be.true;
    expect(createdWorkflow.type).to.equal('BRIDGE');
    expect(createdWorkflow.draft).to.be.false;
    expect(createdWorkflow.critical).to.be.false;
    expect(createdWorkflow.isBlueprint).to.be.false;
    expect(createdWorkflow._notificationGroupId).to.be.a('string');
    expect(createdWorkflow.tags).to.deep.equal(['test']);
    expect(createdWorkflow.triggers).to.be.an('array').with.lengthOf(1);
    expect(createdWorkflow.triggers[0]).to.include({
      type: 'event',
      identifier: 'test-workflow-id',
    });
    expect(createdWorkflow.triggers[0].subscriberVariables).to.be.an('array').with.lengthOf(1);
    expect(createdWorkflow.triggers[0].subscriberVariables[0]).to.include({
      name: 'email',
    });
    expect(createdWorkflow.steps).to.be.an('array').with.lengthOf(2);
    expect(createdWorkflow.steps[0]).to.include({
      uuid: 'email-step',
      stepId: 'email-step',
      name: 'email-step',
      type: 'REGULAR',
    });
    expect(createdWorkflow.steps[1]).to.include({
      uuid: 'in-app-step',
      stepId: 'in-app-step',
      name: 'in-app-step',
      type: 'REGULAR',
    });
  });
});
