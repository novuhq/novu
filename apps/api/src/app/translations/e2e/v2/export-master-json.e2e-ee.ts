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
    // Enable translation feature for testing
    (process.env as any).IS_TRANSLATION_ENABLED = 'true';

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
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId1,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'welcome.title': 'Welcome to our platform',
          'welcome.message': 'Hello {{payload.name}}, welcome aboard!',
        },
      })
      .expect(200);

    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId1,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: {
          'welcome.title': 'Bienvenido a nuestra plataforma',
          'welcome.message': 'Hola {{payload.name}}, ¡bienvenido!',
        },
      })
      .expect(200);
  });

  afterEach(() => {
    // Disable translation feature after each test
    (process.env as any).IS_TRANSLATION_ENABLED = 'false';
  });

  it('should export master JSON with correct structure and content filtering', async () => {
    const { body } = await session.testAgent.get('/v2/translations/master-json?locale=en_US').expect(200);

    // Verify response structure
    expect(body.data).to.have.property('workflows');
    expect(body.data.workflows).to.be.an('object');

    // Should include workflow with translations
    expect(body.data.workflows).to.have.property(workflowId1);

    // Should not include workflow without translations
    expect(body.data.workflows).to.not.have.property(workflowId2);

    // Verify content structure and liquid variables
    expect(body.data.workflows[workflowId1]).to.deep.equal({
      'welcome.title': 'Welcome to our platform',
      'welcome.message': 'Hello {{payload.name}}, welcome aboard!',
    });
  });

  it('should filter by locale correctly', async () => {
    // Test Spanish locale
    const { body: spanishBody } = await session.testAgent.get('/v2/translations/master-json?locale=es_ES').expect(200);

    expect(spanishBody.data.workflows).to.have.property(workflowId1);
    expect(spanishBody.data.workflows[workflowId1]).to.deep.equal({
      'welcome.title': 'Bienvenido a nuestra plataforma',
      'welcome.message': 'Hola {{payload.name}}, ¡bienvenido!',
    });

    // Test non-existent locale
    const { body: emptyBody } = await session.testAgent.get('/v2/translations/master-json?locale=de_DE').expect(200);

    expect(emptyBody.data.workflows).to.be.an('object');
    expect(Object.keys(emptyBody.data.workflows)).to.have.lengthOf(0);
  });

  it('should work without locale parameter', async () => {
    const { body } = await session.testAgent.get('/v2/translations/master-json').expect(200);

    expect(body.data).to.have.property('workflows');
    expect(body.data.workflows).to.be.an('object');
  });

  it('should validate locale format', async () => {
    await session.testAgent.get('/v2/translations/master-json?locale=invalid-locale').expect(422);
  });
});
