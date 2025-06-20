import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get single translation - /v2/translations/:workflowId/:locale (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);

    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow for Translations',
      workflowId: `test-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      steps: [
        {
          name: 'In-App Step',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test content',
          },
        },
      ],
    });
    workflowId = workflow.id;
  });

  it('should get existing translation', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
    };

    // Create translation first
    await session.testAgent
      .post('/v2/translations')
      .send({
        workflowId,
        locale: 'en-US',
        content: translationContent,
      })
      .expect(200);

    // Get the translation
    const { body } = await session.testAgent.get(`/v2/translations/${workflowId}/en-US`).expect(200);

    expect(body.data._workflowId).to.equal(workflowId);
    expect(body.data.locale).to.equal('en-US');
    expect(body.data.content).to.deep.equal(translationContent);
    expect(body.data._id).to.be.a('string');
    expect(body.data.createdAt).to.be.a('string');
    expect(body.data.updatedAt).to.be.a('string');
  });

  it('should return 404 for non-existent translation', async () => {
    await session.testAgent.get(`/v2/translations/${workflowId}/fr-FR`).expect(404);
  });

  it('should return 404 for non-existent workflow', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    await session.testAgent.get(`/v2/translations/${fakeWorkflowId}/en-US`).expect(404);
  });

  it('should validate locale format in URL parameter', async () => {
    await session.testAgent.get(`/v2/translations/${workflowId}/invalid-locale-123`).expect(400);
  });
});
