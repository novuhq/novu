import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Export master JSON - /v2/translations/master-json (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId1: string;
  let workflowId2: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    // Set organization service level to business to avoid payment required errors
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    novuClient = initNovuClassSdkInternalAuth(session);

    // Create first workflow with translations
    const { result: workflow1 } = await novuClient.workflows.create({
      name: 'User Onboarding Workflow',
      workflowId: `user-onboarding-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'Welcome Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Welcome to our platform',
            body: 'Welcome {{payload.name}}!',
          },
        },
      ],
    });
    workflowId1 = workflow1.workflowId;

    // Create second workflow without translations (for testing filtering)
    const { result: workflow2 } = await novuClient.workflows.create({
      name: 'No Translation Workflow',
      workflowId: `no-translation-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: false,
      steps: [
        {
          name: 'Simple Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Simple notification',
            body: 'This workflow has no translations',
          },
        },
      ],
    });
    workflowId2 = workflow2.workflowId;

    // Create translations for first workflow in multiple locales
    await novuClient.translations.create({
      resourceId: workflowId1,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: {
        'welcome.title': 'Welcome to our platform',
        'welcome.message': 'Hello {{payload.name}}, welcome aboard!',
      },
    });

    await novuClient.translations.create({
      resourceId: workflowId1,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'es_ES',
      content: {
        'welcome.title': 'Bienvenido a nuestra plataforma',
        'welcome.message': 'Hola {{payload.name}}, ¡bienvenido!',
      },
    });
  });

  it('should export master JSON with correct structure and content filtering', async () => {
    const response = await novuClient.translations.master.retrieve('en_US');

    // Verify response structure
    expect(response).to.have.property('workflows');
    expect(response.workflows).to.be.an('object');

    // Should include workflow with translations
    expect(response.workflows).to.have.property(workflowId1);

    // Should not include workflow without translations
    expect(response.workflows).to.not.have.property(workflowId2);

    // Verify content structure and liquid variables
    expect(response.workflows[workflowId1]).to.deep.equal({
      'welcome.title': 'Welcome to our platform',
      'welcome.message': 'Hello {{payload.name}}, welcome aboard!',
    });
  });

  it('should filter by locale correctly', async () => {
    // Test Spanish locale
    const spanishResponse = await novuClient.translations.master.retrieve('es_ES');

    expect(spanishResponse.workflows).to.have.property(workflowId1);
    expect(spanishResponse.workflows[workflowId1]).to.deep.equal({
      'welcome.title': 'Bienvenido a nuestra plataforma',
      'welcome.message': 'Hola {{payload.name}}, ¡bienvenido!',
    });

    // Test non-existent locale
    const emptyResponse = await novuClient.translations.master.retrieve('de_DE');

    expect(emptyResponse.workflows).to.be.an('object');
    expect(Object.keys(emptyResponse.workflows)).to.have.lengthOf(0);
  });

  it('should work without locale parameter', async () => {
    const response = await novuClient.translations.master.retrieve();

    expect(response).to.have.property('workflows');
    expect(response.workflows).to.be.an('object');
  });

  it('should validate locale format', async () => {
    try {
      await novuClient.translations.master.retrieve('invalid-locale');
      throw new Error('Should have thrown 422');
    } catch (error: any) {
      expect(error.statusCode).to.equal(422);
    }
  });
});
