import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete translation - /v2/translations/:resourceType/:resourceId/:locale (DELETE) #novu-v2', async () => {
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

  it('should delete existing translation successfully', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
      'button.submit': 'Submit',
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

    // Verify translation exists
    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(200);

    // Delete the translation
    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(204);

    // Verify translation no longer exists
    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(404);
  });

  it('should return 404 when trying to delete non-existent translation', async () => {
    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/fr_FR`)
      .expect(404);
  });

  it('should return 404 when trying to delete translation for non-existent workflow', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${fakeWorkflowId}/en_US`)
      .expect(404);
  });

  it('should validate locale format in URL parameter', async () => {
    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/invalid-locale-123`)
      .expect(400);
  });

  it('should handle underscores in locale and normalize them', async () => {
    const translationContent = {
      'test.key': 'Test value',
    };

    // Create translation with underscore format
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: translationContent,
      })
      .expect(200);

    // Delete with dash format (should be normalized to underscore)
    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en-US`)
      .expect(204);

    // Verify translation no longer exists
    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(404);
  });

  it('should delete only the specified locale, leaving others intact', async () => {
    const englishContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
    };

    const frenchContent = {
      'welcome.title': 'Bienvenue',
      'welcome.message': 'Bonjour!',
    };

    // Create translations in multiple locales
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: englishContent,
      })
      .expect(200);

    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'fr_FR',
        content: frenchContent,
      })
      .expect(200);

    // Delete only the English translation
    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(204);

    // Verify English translation is gone
    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(404);

    // Verify French translation still exists
    const { body } = await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/fr_FR`)
      .expect(200);
    expect(body.data.content).to.deep.equal(frenchContent);
  });

  it('should work with complex locale codes', async () => {
    const translationContent = {
      'test.key': 'Chinese Traditional content',
    };

    // Create translation with complex locale
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'zh_Hans_CN',
        content: translationContent,
      })
      .expect(200);

    // Delete the translation
    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/zh_Hans_CN`)
      .expect(204);

    // Verify translation no longer exists
    await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/zh_Hans_CN`)
      .expect(404);
  });
});
