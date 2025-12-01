import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete translation group - /v2/translations/:resourceType/:resourceId (DELETE) #novu-v2', async () => {
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
      name: 'Test Workflow for Translation Group Deletion',
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

  it('should delete entire translation group with all translations successfully', async () => {
    const translations = [
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: { 'welcome.title': 'Welcome', 'welcome.message': 'Hello there!' },
      },
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: { 'welcome.title': 'Bienvenido', 'welcome.message': '¡Hola!' },
      },
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'fr_FR',
        content: { 'welcome.title': 'Bienvenue', 'welcome.message': 'Bonjour!' },
      },
    ];

    // Create multiple translations
    for (const translation of translations) {
      await novuClient.translations.create(translation);
    }

    // Delete the entire translation group
    await novuClient.translations.groups.delete(LocalizationResourceEnum.WORKFLOW, workflowId);

    // Verify all translations are deleted
    for (const translation of translations) {
      try {
        await novuClient.translations.retrieve({
          resourceType: translation.resourceType,
          resourceId: translation.resourceId,
          locale: translation.locale,
        });
        throw new Error('Should have thrown 404');
      } catch (error: any) {
        expect(error.statusCode).to.equal(404);
      }
    }
  });

  it('should return 404 when trying to delete non-existent translation group', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    try {
      await novuClient.translations.groups.delete(LocalizationResourceEnum.WORKFLOW, fakeWorkflowId);
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
  });

  it('should return 404 when trying to delete non-existent translation group for workflow without translations enabled', async () => {
    // Create a workflow with translations disabled (no translation group created)
    const { result: workflowWithoutTranslations } = await novuClient.workflows.create({
      name: 'Workflow Without Translations',
      workflowId: `workflow-no-translations-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: false, // This prevents automatic translation group creation
      steps: [
        {
          name: 'No Translation Step',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'No translation content',
          },
        },
      ],
    });

    try {
      await novuClient.translations.groups.delete(
        LocalizationResourceEnum.WORKFLOW,
        workflowWithoutTranslations.workflowId
      );
      throw new Error('Should have thrown 404');
    } catch (error: any) {
      expect(error.statusCode).to.equal(404);
    }
  });
});
