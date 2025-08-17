import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Upload master JSON file - /v2/translations/master-json/upload (POST) #novu-v2', async () => {
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

    // Create workflow for basic integration test
    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow',
      workflowId: `test-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'Test Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Test subject',
            body: 'Test body',
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

  it('should upload master JSON file successfully', async () => {
    const masterJson = {
      workflows: {
        [workflowId]: {
          'test.key': 'Test value',
          'another.key': 'Another value',
        },
      },
    };

    const { body } = await session.testAgent
      .post('/v2/translations/master-json/upload')
      .attach('file', Buffer.from(JSON.stringify(masterJson)), 'en_US.json')
      .expect(200);

    expect(body.data.success).to.be.true;
    expect(body.data.message).to.include('1 resource');

    // Test new response structure
    expect(body.data.successful).to.be.an('array');
    expect(body.data.successful).to.have.lengthOf(1);
    expect(body.data.successful).to.include(workflowId);
    expect(body.data.failed).to.be.undefined; // No failures

    // Verify translation was created (basic integration test)
    const { body: translation } = await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(200);

    expect(translation.data.content).to.deep.equal(masterJson.workflows[workflowId]);
  });

  it('should handle mixed success and failure in uploaded file', async () => {
    const nonExistentWorkflowId = '507f1f77bcf86cd799439011';
    const masterJson = {
      workflows: {
        [workflowId]: {
          'valid.key': 'Valid content',
        },
        [nonExistentWorkflowId]: {
          'invalid.key': 'Content for non-existent workflow',
        },
      },
    };

    const { body } = await session.testAgent
      .post('/v2/translations/master-json/upload')
      .field('locale', 'en_US')
      .attach('file', Buffer.from(JSON.stringify(masterJson)), 'en_US.json')
      .expect(200);

    expect(body.data.success).to.be.true;
    expect(body.data.message).to.include('Partial import completed');

    // Test enhanced response structure for mixed results
    expect(body.data.successful).to.be.an('array');
    expect(body.data.successful).to.have.lengthOf(1);
    expect(body.data.successful).to.include(workflowId);

    expect(body.data.failed).to.be.an('array');
    expect(body.data.failed).to.have.lengthOf(1);
    expect(body.data.failed).to.include(nonExistentWorkflowId);
  });

  it('should validate file requirements', async () => {
    const masterJson = {
      workflows: {
        [workflowId]: {
          'test.key': 'Test value',
        },
      },
    };

    // Test missing file
    await session.testAgent.post('/v2/translations/master-json/upload').expect(400);

    // Test multiple files (should only allow one)
    await session.testAgent
      .post('/v2/translations/master-json/upload')
      .attach('file', Buffer.from(JSON.stringify(masterJson)), 'en_US.json')
      .attach('file', Buffer.from(JSON.stringify(masterJson)), 'fr_FR.json')
      .expect(400);
  });

  it('should validate filename format', async () => {
    const masterJson = {
      workflows: {
        [workflowId]: {
          'test.key': 'Test value',
        },
      },
    };

    // Test invalid filename patterns
    const invalidFilenames = ['invalid-filename.json', 'en_US-master.json', 'en_US.txt', 'notlocale.json', 'en.json'];

    for (const filename of invalidFilenames) {
      await session.testAgent
        .post('/v2/translations/master-json/upload')
        .field('locale', 'en_US')
        .attach('file', Buffer.from(JSON.stringify(masterJson)), filename)
        .expect(400);
    }

    // Test valid filename patterns
    const validFilenames = ['en_US.json', 'fr_FR.json', 'zh_CN.json'];

    for (const filename of validFilenames) {
      const { body } = await session.testAgent
        .post('/v2/translations/master-json/upload')
        .field('locale', 'en_US')
        .attach('file', Buffer.from(JSON.stringify(masterJson)), filename)
        .expect(200);

      // Verify response structure for valid uploads
      expect(body.data.success).to.be.true;
      expect(body.data.successful).to.be.an('array');
      expect(body.data.successful).to.include(workflowId);
    }
  });

  it('should handle file processing correctly', async () => {
    const masterJson = {
      workflows: {
        [workflowId]: {
          'unicode.test': 'Hello 👋 世界 🌍',
          'liquid.test': 'Hello {{payload.name | upcase}}',
        },
      },
    };

    // Test formatted JSON (with indentation)
    const formattedJson = JSON.stringify(masterJson, null, 2);
    const { body: formattedResponse } = await session.testAgent
      .post('/v2/translations/master-json/upload')
      .field('locale', 'en_US')
      .attach('file', Buffer.from(formattedJson, 'utf8'), 'en_US.json')
      .expect(200);

    expect(formattedResponse.data.success).to.be.true;
    expect(formattedResponse.data.successful).to.include(workflowId);

    // Test compressed JSON
    const compressedJson = JSON.stringify(masterJson);
    const { body: compressedResponse } = await session.testAgent
      .post('/v2/translations/master-json/upload')
      .field('locale', 'fr_FR')
      .attach('file', Buffer.from(compressedJson, 'utf8'), 'fr_FR.json')
      .expect(200);

    expect(compressedResponse.data.success).to.be.true;
    expect(compressedResponse.data.successful).to.include(workflowId);

    // Verify Unicode and liquid variables are preserved
    const { body: translation } = await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(200);

    expect(translation.data.content['unicode.test']).to.equal('Hello 👋 世界 🌍');
    expect(translation.data.content['liquid.test']).to.equal('Hello {{payload.name | upcase}}');
  });

  it('should reject invalid JSON files', async () => {
    // Test invalid JSON content
    await session.testAgent
      .post('/v2/translations/master-json/upload')
      .field('locale', 'en_US')
      .attach('file', Buffer.from('invalid json content'), 'en_US.json')
      .expect(400);

    // Test empty file
    await session.testAgent
      .post('/v2/translations/master-json/upload')
      .field('locale', 'en_US')
      .attach('file', Buffer.from(''), 'en_US.json')
      .expect(400);

    // Test non-JSON file
    await session.testAgent
      .post('/v2/translations/master-json/upload')
      .field('locale', 'en_US')
      .attach('file', Buffer.from('<xml>not json</xml>'), 'en_US.json')
      .expect(400);
  });

  it('should handle empty workflows object in uploaded file', async () => {
    const masterJson = {
      workflows: {},
    };

    const { body } = await session.testAgent
      .post('/v2/translations/master-json/upload')
      .field('locale', 'en_US')
      .attach('file', Buffer.from(JSON.stringify(masterJson)), 'en_US.json')
      .expect(200);

    expect(body.data.success).to.be.false;
    expect(body.data.message).to.include('No supported resources found');
    expect(body.data.successful).to.be.undefined;
    expect(body.data.failed).to.be.undefined;
  });
});
