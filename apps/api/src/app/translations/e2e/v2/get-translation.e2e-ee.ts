import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get single translation - /v2/translations/:resourceType/:resourceId/:locale (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId: string;

  beforeEach(async () => {
    // Enable translation feature for testing
    (process.env as any).IS_TRANSLATION_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();

    // Set organization service level to business to avoid payment required errors
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    novuClient = initNovuClassSdkInternalAuth(session);

    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow for Translations',
      workflowId: `test-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
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
    workflowId = workflow.workflowId;
  });

  afterEach(() => {
    // Disable translation feature after each test
    (process.env as any).IS_TRANSLATION_ENABLED = 'false';
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
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: translationContent,
      })
      .expect(200);

    // Get the translation
    const { body } = await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(200);

    expect(body.data.resourceId).to.equal(workflowId);
    expect(body.data.resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    expect(body.data.locale).to.equal('en_US');
    expect(body.data.content).to.deep.equal(translationContent);
    expect(body.data.createdAt).to.be.a('string');
    expect(body.data.updatedAt).to.be.a('string');
  });

  it('should return 404 for non-existent translation', async () => {
    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/fr_FR`)
      .expect(404);
  });

  it('should return 404 for non-existent workflow', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${fakeWorkflowId}/en_US`)
      .expect(404);
  });

  it('should validate locale format in URL parameter', async () => {
    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/invalid-locale-123`)
      .expect(400);
  });
});
