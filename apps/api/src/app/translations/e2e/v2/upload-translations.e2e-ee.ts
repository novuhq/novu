import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Upload translation files - /v2/translations/upload (POST) #novu-v2', async () => {
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

  afterEach(() => {
    // Disable translation feature after each test
    (process.env as any).IS_TRANSLATION_ENABLED = 'false';
  });

  it('should upload single translation file', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
      'button.submit': 'Submit',
    };

    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from(JSON.stringify(translationContent)), 'en_US.json')
      .expect(200);

    expect(body.data.totalFiles).to.equal(1);
    expect(body.data.successfulUploads).to.equal(1);
    expect(body.data.failedUploads).to.equal(0);
    expect(body.data.errors).to.be.an('array').that.is.empty;

    // Verify the translation was created
    const { body: translation } = await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(200);

    expect(translation.data.content).to.deep.equal(translationContent);
  });

  it('should upload multiple translation files', async () => {
    const enContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
    };

    const esContent = {
      'welcome.title': 'Bienvenido',
      'welcome.message': '¡Hola!',
    };

    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from(JSON.stringify(enContent)), 'en_US.json')
      .attach('files', Buffer.from(JSON.stringify(esContent)), 'es_ES.json')
      .expect(200);

    expect(body.data.totalFiles).to.equal(2);
    expect(body.data.successfulUploads).to.equal(2);
    expect(body.data.failedUploads).to.equal(0);
    expect(body.data.errors).to.be.an('array').that.is.empty;

    // Verify both translations were created
    const { body: allTranslations } = await session.testAgent
      .get(`/v2/translations?resourceId=${workflowId}&resourceType=${LocalizationResourceEnum.WORKFLOW}`)
      .expect(200);

    expect(allTranslations.total).to.equal(2);
  });

  it('should update existing translation when uploading same locale', async () => {
    const originalContent = { key1: 'original value' };
    const updatedContent = { key1: 'updated value', key2: 'new value' };

    // Upload initial translation
    await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from(JSON.stringify(originalContent)), 'en_US.json')
      .expect(200);

    // Upload updated translation
    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from(JSON.stringify(updatedContent)), 'en_US.json')
      .expect(200);

    expect(body.data.successfulUploads).to.equal(1);

    // Verify the content was updated
    const { body: translation } = await session.testAgent
      .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/en_US`)
      .expect(200);

    expect(translation.data.content).to.deep.equal(updatedContent);
  });

  it('should handle different filename patterns', async () => {
    const content = { key: 'value' };

    const testCases = [
      { filename: 'en_US.json', expectedLocale: 'en_US' },
      { filename: 'fr_FR.json', expectedLocale: 'fr_FR' },
      { filename: 'de_DE.json', expectedLocale: 'de_DE' },
      { filename: 'it_IT.json', expectedLocale: 'it_IT' },
    ];

    for (const testCase of testCases) {
      const { body } = await session.testAgent
        .post('/v2/translations/upload')
        .field('resourceId', workflowId)
        .field('resourceType', LocalizationResourceEnum.WORKFLOW)
        .attach('files', Buffer.from(JSON.stringify(content)), testCase.filename)
        .expect(200);

      expect(body.data.successfulUploads).to.equal(1);

      // Verify the locale was extracted correctly
      const { body: translation } = await session.testAgent
        .get(`/v2/translations/${LocalizationResourceEnum.WORKFLOW}/${workflowId}/${testCase.expectedLocale}`)
        .expect(200);

      expect(translation.data.locale).to.equal(testCase.expectedLocale);
    }
  });

  it('should reject invalid JSON files', async () => {
    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from('invalid json content'), 'en_US.json')
      .expect(400);

    expect(body.message).to.include('No valid translation files were found');
  });

  it('should reject files with invalid locale patterns', async () => {
    const content = { key: 'value' };

    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from(JSON.stringify(content)), 'invalid-filename.json')
      .expect(400);

    expect(body.message).to.include('invalid names or formats');
    expect(body.errors).to.be.an('array').that.is.not.empty;
    expect(body.errors[0]).to.include('invalid-filename.json');
  });

  it('should require resourceId and resourceType', async () => {
    const content = { key: 'value' };

    await session.testAgent
      .post('/v2/translations/upload')
      .attach('files', Buffer.from(JSON.stringify(content)), 'en_US.json')
      .expect(422);
  });

  it('should reject uploads with invalid filename patterns', async () => {
    const validContent = { key: 'value' };

    // This test should fail at validation level because invalid-name.json has invalid locale pattern
    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'en_US.json')
      .attach('files', Buffer.from('invalid json'), 'es_ES.json')
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'invalid-name.json')
      .expect(400);

    expect(body.message).to.include('invalid names or formats');
    expect(body.errors).to.be.an('array').that.is.not.empty;
    expect(body.errors[0]).to.include('invalid-name.json');
  });

  it('should handle mixed success and failure uploads with valid filenames', async () => {
    const validContent = { key: 'value' };

    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('resourceId', workflowId)
      .field('resourceType', LocalizationResourceEnum.WORKFLOW)
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'en_US.json')
      .attach('files', Buffer.from('invalid json'), 'es_ES.json')
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'fr_FR.json')
      .expect(200);

    expect(body.data.totalFiles).to.equal(3);
    expect(body.data.successfulUploads).to.equal(2);
    expect(body.data.failedUploads).to.equal(1);
    expect(body.data.errors).to.have.lengthOf(1);
    expect(body.data.errors[0]).to.include("Failed to process file 'es_ES.json'");
  });
});
