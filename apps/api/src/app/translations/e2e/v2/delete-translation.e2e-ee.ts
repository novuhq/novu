import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete translation - /v2/translations/:resourceType/:resourceId/:locale (DELETE) #novu-v2', async () => {
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

  it('should delete existing translation successfully', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
      'button.submit': 'Submit',
    };

    // Create translation first
    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: translationContent,
    });

    // Verify translation exists
    await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    // Delete the translation
    await novuClient.translations.delete({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    // Verify translation no longer exists
    try {
      await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'en_US',
      });
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
  });

  it('should return 404 when trying to delete non-existent translation', async () => {
    try {
      await novuClient.translations.delete({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'fr_FR',
      });
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
  });

  it('should return 404 when trying to delete translation for non-existent workflow', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    try {
      await novuClient.translations.delete({
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
      await novuClient.translations.delete({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'invalid-locale-123',
      });
      throw new Error('Should have thrown 400');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
    }
  });

  it('should handle underscores in locale and normalize them', async () => {
    const translationContent = {
      'test.key': 'Test value',
    };

    // Create translation with underscore format
    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: translationContent,
    });

    // Delete with dash format (should be normalized to underscore)
    await novuClient.translations.delete({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en-US',
    });

    // Verify translation no longer exists
    try {
      await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'en_US',
      });
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
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
    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: englishContent,
    });

    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'fr_FR',
      content: frenchContent,
    });

    // Delete only the English translation
    await novuClient.translations.delete({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    // Verify English translation is gone
    try {
      await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'en_US',
      });
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }

    // Verify French translation still exists
    const response = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'fr_FR',
    });
    expect(response.content).to.deep.equal(frenchContent);
  });

  it('should work with complex locale codes', async () => {
    const translationContent = {
      'test.key': 'Chinese Simplified content',
    };

    // Create translation with complex locale
    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'zh_CN',
      content: translationContent,
    });

    // Delete the translation
    await novuClient.translations.delete({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'zh_CN',
    });

    // Verify translation no longer exists
    try {
      await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: 'zh_CN',
      });
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
  });
});
