import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get single translation group - /v2/translations/group/:resourceType/:resourceId (GET) #novu-v2', async () => {
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
      name: 'Test Workflow for Translation Group',
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

  it('should get translation group with multiple locales', async () => {
    const translations = [
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'welcome.title': 'Welcome',
          'welcome.message': 'Hello there!',
          'button.submit': 'Submit',
        },
      },
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: {
          'welcome.title': 'Bienvenido',
          'welcome.message': '¡Hola!',
          'button.submit': 'Enviar',
        },
      },
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'fr_FR',
        content: {
          'welcome.title': 'Bienvenue',
          'welcome.message': 'Bonjour!',
          'button.submit': 'Soumettre',
        },
      },
    ];

    // Create translations
    for (const translation of translations) {
      await session.testAgent.post('/v2/translations').send(translation).expect(200);
    }

    // Get the translation group
    const { body } = await session.testAgent
      .get(`/v2/translations/group/${LocalizationResourceEnum.WORKFLOW}/${workflowId}`)
      .expect(200);

    expect(body.data.resourceId).to.equal(workflowId);
    expect(body.data.resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    expect(body.data.resourceName).to.equal('Test Workflow for Translation Group');
    expect(body.data.locales).to.be.an('array');
    expect(body.data.locales).to.have.lengthOf(3);
    expect(body.data.locales).to.include.members(['en_US', 'es_ES', 'fr_FR']);
    expect(body.data.createdAt).to.be.a('string');
    expect(body.data.updatedAt).to.be.a('string');
  });

  it('should include outdatedLocales when present', async () => {
    const translations = [
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'welcome.title': 'Welcome',
          'welcome.message': 'Hello there!',
        },
      },
      {
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: {
          'welcome.title': 'Bienvenido',
          'welcome.message': '¡Hola!',
        },
      },
    ];

    // Create translations
    for (const translation of translations) {
      await session.testAgent.post('/v2/translations').send(translation).expect(200);
    }

    // Update the default locale (en_US) to make es_ES outdated
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'welcome.title': 'Welcome Updated',
          'welcome.message': 'Hello there, updated!',
          'new.key': 'New content',
        },
      })
      .expect(200);

    // Get the translation group
    const { body } = await session.testAgent
      .get(`/v2/translations/group/${LocalizationResourceEnum.WORKFLOW}/${workflowId}`)
      .expect(200);

    expect(body.data.resourceId).to.equal(workflowId);
    expect(body.data.locales).to.include.members(['en_US', 'es_ES']);

    // Should include outdatedLocales if there are any
    if (body.data.outdatedLocales) {
      expect(body.data.outdatedLocales).to.be.an('array');
      expect(body.data.outdatedLocales).to.include('es_ES');
    }
  });

  it('should return 404 for non-existent translation group', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    await session.testAgent
      .get(`/v2/translations/group/${LocalizationResourceEnum.WORKFLOW}/${fakeWorkflowId}`)
      .expect(404);
  });

  it('should return 404 for workflow without translations', async () => {
    // Create a workflow without any translations
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
      .get(`/v2/translations/group/${LocalizationResourceEnum.WORKFLOW}/${workflowWithoutTranslations.workflowId}`)
      .expect(404);
  });

  it('should return consistent structure with list endpoint', async () => {
    // Create translation
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: { 'test.key': 'Test value' },
      })
      .expect(200);

    // Get single group
    const { body: singleGroup } = await session.testAgent
      .get(`/v2/translations/group/${LocalizationResourceEnum.WORKFLOW}/${workflowId}`)
      .expect(200);

    // Get list and find the same group
    const { body: listResponse } = await session.testAgent.get('/v2/translations/list').expect(200);

    const groupFromList = listResponse.data.find((group: any) => group.resourceId === workflowId);

    // Both should have the same structure
    expect(singleGroup.data).to.have.property('resourceId');
    expect(singleGroup.data).to.have.property('resourceType');
    expect(singleGroup.data).to.have.property('resourceName');
    expect(singleGroup.data).to.have.property('locales');
    expect(singleGroup.data).to.have.property('createdAt');
    expect(singleGroup.data).to.have.property('updatedAt');

    expect(groupFromList).to.have.property('resourceId');
    expect(groupFromList).to.have.property('resourceType');
    expect(groupFromList).to.have.property('resourceName');
    expect(groupFromList).to.have.property('locales');
    expect(groupFromList).to.have.property('createdAt');
    expect(groupFromList).to.have.property('updatedAt');

    // Values should match
    expect(singleGroup.data.resourceId).to.equal(groupFromList.resourceId);
    expect(singleGroup.data.resourceType).to.equal(groupFromList.resourceType);
    expect(singleGroup.data.resourceName).to.equal(groupFromList.resourceName);
    expect(singleGroup.data.locales).to.deep.equal(groupFromList.locales);
  });
});
