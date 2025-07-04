import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get translations list - /v2/translations (GET) #novu-v2', async () => {
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

    const { result: workflow1 } = await novuClient.workflows.create({
      name: 'Test Workflow 1 for Translations',
      workflowId: `test-workflow-1-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'In-App Step 1',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test content 1',
          },
        },
      ],
    });
    workflowId1 = workflow1.workflowId;

    const { result: workflow2 } = await novuClient.workflows.create({
      name: 'Test Workflow 2 for Translations',
      workflowId: `test-workflow-2-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'In-App Step 2',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test content 2',
          },
        },
      ],
    });
    workflowId2 = workflow2.workflowId;

    // Create test data
    const translations = [
      {
        resourceId: workflowId1,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: { key1: 'value1' },
      },
      {
        resourceId: workflowId1,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: { key1: 'valor1' },
      },
      {
        resourceId: workflowId2,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: { key2: 'value2' },
      },
      {
        resourceId: workflowId2,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'fr_FR',
        content: { key2: 'valeur2' },
      },
    ];

    for (const translation of translations) {
      await session.testAgent.post('/v2/translations').send(translation).expect(200);
    }
  });

  afterEach(() => {
    // Disable translation feature after each test
    (process.env as any).IS_TRANSLATION_ENABLED = 'false';
  });

  it('should get all translations without filters', async () => {
    const { body } = await session.testAgent.get('/v2/translations').expect(200);

    expect(body.data).to.be.an('array');
    expect(body.total).to.equal(4);
    expect(body.data).to.have.lengthOf(4);
  });

  it('should filter by resourceId and resourceType', async () => {
    const { body } = await session.testAgent
      .get(`/v2/translations?resourceId=${workflowId1}&resourceType=${LocalizationResourceEnum.WORKFLOW}`)
      .expect(200);

    expect(body.data).to.have.lengthOf(2);
    expect(body.total).to.equal(2);
    body.data.forEach((translation: any) => {
      expect(translation.resourceId).to.equal(workflowId1);
      expect(translation.resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    });
  });

  it('should filter by locale', async () => {
    const { body } = await session.testAgent.get('/v2/translations?locale=en_US').expect(200);

    expect(body.data).to.have.lengthOf(2);
    expect(body.total).to.equal(2);
    body.data.forEach((translation: any) => {
      expect(translation.locale).to.equal('en_US');
    });
  });

  it('should filter by resourceId, resourceType and locale', async () => {
    const { body } = await session.testAgent
      .get(`/v2/translations?resourceId=${workflowId1}&resourceType=${LocalizationResourceEnum.WORKFLOW}&locale=es_ES`)
      .expect(200);

    expect(body.data).to.have.lengthOf(1);
    expect(body.total).to.equal(1);
    expect(body.data[0].resourceId).to.equal(workflowId1);
    expect(body.data[0].resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    expect(body.data[0].locale).to.equal('es_ES');
  });

  it('should return empty result for non-matching filters', async () => {
    const { body } = await session.testAgent.get('/v2/translations?locale=de_DE').expect(200);

    expect(body.data).to.have.lengthOf(0);
    expect(body.total).to.equal(0);
  });
});
