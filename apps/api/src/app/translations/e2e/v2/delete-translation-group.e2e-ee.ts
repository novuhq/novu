import { UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete translation group - /v2/translations/:resourceType/:resourceId (DELETE) #novu-v2', async () => {
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

  afterEach(() => {
    // Disable translation feature after each test
    (process.env as any).IS_TRANSLATION_ENABLED = 'false';
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
      await session.testAgent.post('/v2/translations').send(translation).expect(200);
    }

    // Delete the entire translation group
    await session.testAgent.delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}`).expect(204);

    // Verify all translations are deleted
    for (const translation of translations) {
      await session.testAgent
        .get(`/v2/translations/${translation.resourceType}/${translation.resourceId}/${translation.locale}`)
        .expect(404);
    }
  });

  it('should return 404 when trying to delete non-existent translation group', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${fakeWorkflowId}`)
      .expect(404);
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

    await session.testAgent
      .delete(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowWithoutTranslations.workflowId}`)
      .expect(404);
  });
});
