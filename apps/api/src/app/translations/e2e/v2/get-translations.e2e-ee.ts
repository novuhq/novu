import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get translations list - /v2/translations (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId1: string;
  let workflowId2: string;

  beforeEach(async () => {
    // Enable translation feature for testing
    // @ts-ignore - Setting environment variable for testing
    process.env.IS_TRANSLATION_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);

    const { result: workflow1 } = await novuClient.workflows.create({
      name: 'Test Workflow 1 for Translations',
      workflowId: `test-workflow-1-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
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
    workflowId1 = workflow1.id;

    const { result: workflow2 } = await novuClient.workflows.create({
      name: 'Test Workflow 2 for Translations',
      workflowId: `test-workflow-2-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
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
    workflowId2 = workflow2.id;

    // Create test data
    const translations = [
      { workflowId: workflowId1, locale: 'en_US', content: { key1: 'value1' } },
      { workflowId: workflowId1, locale: 'es_ES', content: { key1: 'valor1' } },
      { workflowId: workflowId2, locale: 'en_US', content: { key2: 'value2' } },
      { workflowId: workflowId2, locale: 'fr_FR', content: { key2: 'valeur2' } },
    ];

    for (const translation of translations) {
      await session.testAgent.post('/v2/translations').send(translation).expect(200);
    }
  });

  afterEach(() => {
    // Disable translation feature after each test
    // @ts-ignore - Setting environment variable for testing
    process.env.IS_TRANSLATION_ENABLED = 'false';
  });

  it('should get all translations without filters', async () => {
    const { body } = await session.testAgent.get('/v2/translations').expect(200);

    expect(body.data).to.be.an('array');
    expect(body.total).to.equal(4);
    expect(body.data).to.have.lengthOf(4);
  });

  it('should filter by workflowId', async () => {
    const { body } = await session.testAgent.get(`/v2/translations?workflowId=${workflowId1}`).expect(200);

    expect(body.data).to.have.lengthOf(2);
    expect(body.total).to.equal(2);
    body.data.forEach((translation: any) => {
      expect(translation._workflowId).to.equal(workflowId1);
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

  it('should filter by both workflowId and locale', async () => {
    const { body } = await session.testAgent.get(`/v2/translations?workflowId=${workflowId1}&locale=es_ES`).expect(200);

    expect(body.data).to.have.lengthOf(1);
    expect(body.total).to.equal(1);
    expect(body.data[0]._workflowId).to.equal(workflowId1);
    expect(body.data[0].locale).to.equal('es_ES');
  });

  it('should return empty result for non-matching filters', async () => {
    const { body } = await session.testAgent.get('/v2/translations?locale=de_DE').expect(200);

    expect(body.data).to.have.lengthOf(0);
    expect(body.total).to.equal(0);
  });
});
