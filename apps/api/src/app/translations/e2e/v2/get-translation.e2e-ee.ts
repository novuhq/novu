import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get single translation - /v2/translations/:resourceType/:resourceId/:locale (GET) #novu-v2', async () => {
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

  it('should get existing translation', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
    };

    // Create translation first
    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: translationContent,
    });

    // Get the translation
    const response = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    expect(response.resourceId).to.equal(workflowId);
    expect(response.resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    expect(response.locale).to.equal('en_US');
    expect(response.content).to.deep.equal(translationContent);
    expect(response.createdAt).to.be.a('string');
    expect(response.updatedAt).to.be.a('string');
  });

  it('should return 404 for non-existent translation', async () => {
    try {
      await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'fr_FR',
      });
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
  });

  it('should return 404 for non-existent workflow', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    try {
      await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: fakeWorkflowId,
        locale: 'en_US',
      });
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
  });

  it('should validate locale format in URL parameter', async () => {
    try {
      await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'invalid-locale-123',
      });
      throw new Error('Should have thrown 400');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
    }
  });
});
