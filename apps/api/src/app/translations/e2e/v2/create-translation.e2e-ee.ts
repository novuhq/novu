import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Create/update translation - /v2/translations (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId: string;

  beforeEach(async () => {
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

    const response = await novuClient.translations.create(requestBody);

    expect(response.locale).to.equal('en_US');
    expect(response.resourceId).to.equal(workflowId);
    expect(response.resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    expect(response.content).to.deep.equal(requestBody.content);
    expect(response.createdAt).to.be.a('string');
    expect(response.updatedAt).to.be.a('string');
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
    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: originalContent,
    });

    // Update the translation
    const response = await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: updatedContent,
    });

    expect(response.content).to.deep.equal(updatedContent);
  });

  it('should validate locale format', async () => {
    try {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: '123',
        content: { key: 'value' },
      });
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      expect(error.statusCode).to.equal(422);
    }
  });
});
