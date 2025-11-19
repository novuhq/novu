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

  it('should upload master JSON file successfully', async () => {
    const masterJson = {
      workflows: {
        [workflowId]: {
          'test.key': 'Test value',
          'another.key': 'Another value',
        },
      },
    };

    const response = await novuClient.translations.master.upload({
      file: {
        fileName: 'en_US.json',
        content: Buffer.from(JSON.stringify(masterJson)),
      },
    });

    expect(response.success).to.be.true;
    expect(response.message).to.include('1 resource');

    // Test new response structure
    expect(response.successful).to.be.an('array');
    expect(response.successful).to.have.lengthOf(1);
    expect(response.successful).to.include(workflowId);
    expect(response.failed).to.be.undefined; // No failures

    // Verify translation was created (basic integration test)
    const translation = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    expect(translation.content).to.deep.equal(masterJson.workflows[workflowId]);
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

    const response = await novuClient.translations.master.upload({
      file: {
        fileName: 'en_US.json',
        content: Buffer.from(JSON.stringify(masterJson)),
      },
    });

    expect(response.success).to.be.true;
    expect(response.message).to.include('Partial import completed');

    // Test enhanced response structure for mixed results
    expect(response.successful).to.be.an('array');
    expect(response.successful).to.have.lengthOf(1);
    expect(response.successful).to.include(workflowId);

    expect(response.failed).to.be.an('array');
    expect(response.failed).to.have.lengthOf(1);
    expect(response.failed).to.include(nonExistentWorkflowId);
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
      try {
        await novuClient.translations.master.upload({
          file: {
            fileName: filename,
            content: Buffer.from(JSON.stringify(masterJson)),
          },
        });
        expect.fail(`Should have thrown an error for filename: ${filename}`);
      } catch (error: any) {
        expect(error.statusCode).to.equal(400);
      }
    }

    // Test valid filename patterns
    const validFilenames = ['en_US.json', 'fr_FR.json', 'zh_CN.json'];

    for (const filename of validFilenames) {
      const response = await novuClient.translations.master.upload({
        file: {
          fileName: filename,
          content: Buffer.from(JSON.stringify(masterJson)),
        },
      });

      // Verify response structure for valid uploads
      expect(response.success).to.be.true;
      expect(response.successful).to.be.an('array');
      expect(response.successful).to.include(workflowId);
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
    const formattedResponse = await novuClient.translations.master.upload({
      file: {
        fileName: 'en_US.json',
        content: Buffer.from(formattedJson, 'utf8'),
      },
    });

    expect(formattedResponse.success).to.be.true;
    expect(formattedResponse.successful).to.include(workflowId);

    // Test compressed JSON
    const compressedJson = JSON.stringify(masterJson);
    const compressedResponse = await novuClient.translations.master.upload({
      file: {
        fileName: 'fr_FR.json',
        content: Buffer.from(compressedJson, 'utf8'),
      },
    });

    expect(compressedResponse.success).to.be.true;
    expect(compressedResponse.successful).to.include(workflowId);

    // Verify Unicode and liquid variables are preserved
    const translation = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    expect(translation.content['unicode.test']).to.equal('Hello 👋 世界 🌍');
    expect(translation.content['liquid.test']).to.equal('Hello {{payload.name | upcase}}');
  });

  it('should reject invalid JSON files', async () => {
    // Test invalid JSON content
    try {
      await novuClient.translations.master.upload({
        file: {
          fileName: 'en_US.json',
          content: Buffer.from('invalid json content'),
        },
      });
      expect.fail('Should have thrown an error for invalid JSON');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
    }

    // Test empty file
    try {
      await novuClient.translations.master.upload({
        file: {
          fileName: 'en_US.json',
          content: Buffer.from(''),
        },
      });
      expect.fail('Should have thrown an error for empty file');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
    }

    // Test non-JSON file
    try {
      await novuClient.translations.master.upload({
        file: {
          fileName: 'en_US.json',
          content: Buffer.from('<xml>not json</xml>'),
        },
      });
      expect.fail('Should have thrown an error for non-JSON file');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
    }
  });

  it('should handle empty workflows object in uploaded file', async () => {
    const masterJson = {
      workflows: {},
    };

    const response = await novuClient.translations.master.upload({
      file: {
        fileName: 'en_US.json',
        content: Buffer.from(JSON.stringify(masterJson)),
      },
    });

    expect(response.success).to.be.false;
    expect(response.message).to.include('No supported resources found');
    expect(response.successful).to.be.undefined;
    expect(response.failed).to.be.undefined;
  });
});
