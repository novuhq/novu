import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Create/update translation - /v2/translations (POST) #novu-v2', async () => {
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

  it('should create new translation successfully', async () => {
    const requestBody = {
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: {
        'welcome.title': 'Welcome',
        'welcome.message': 'Hello there!',
        'button.submit': 'Submit',
      },
    };

    const { body } = await session.testAgent.post('/v2/translations').send(requestBody).expect(200);

    console.log(body);

    expect(body.data.locale).to.equal('en_US');
    expect(body.data.resourceId).to.equal(workflowId);
    expect(body.data.resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    expect(body.data.content).to.deep.equal(requestBody.content);
    expect(body.data.createdAt).to.be.a('string');
    expect(body.data.updatedAt).to.be.a('string');
  });

  it('should update existing translation', async () => {
    const originalContent = {
      key1: 'original value',
      key2: 'another value',
    };
    const updatedContent = {
      key1: 'updated value',
      key3: 'new value',
    };

    // Create initial translation
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: originalContent,
      })
      .expect(200);

    // Update the translation
    const { body } = await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: updatedContent,
      })
      .expect(200);

    expect(body.data.content).to.deep.equal(updatedContent);
  });

  it('should validate locale format', async () => {
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: '123',
        content: { key: 'value' },
      })
      .expect(422);
  });
});
