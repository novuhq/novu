import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe.only('Upload translation files - /v2/translations/upload (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);

    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow for Translations',
      workflowId: `test-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
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
    workflowId = workflow.id;
  });

  it('should upload single translation file', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
      'button.submit': 'Submit',
    };

    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('workflowId', workflowId)
      .attach('files', Buffer.from(JSON.stringify(translationContent)), 'en-US.json')
      .expect(200);

    expect(body.data.totalFiles).to.equal(1);
    expect(body.data.successfulUploads).to.equal(1);
    expect(body.data.failedUploads).to.equal(0);
    expect(body.data.errors).to.be.an('array').that.is.empty;

    // Verify the translation was created
    const { body: translation } = await session.testAgent.get(`/v2/translations/${workflowId}/en-US`).expect(200);

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
      .field('workflowId', workflowId)
      .attach('files', Buffer.from(JSON.stringify(enContent)), 'en-US.json')
      .attach('files', Buffer.from(JSON.stringify(esContent)), 'es-ES.json')
      .expect(200);

    expect(body.data.totalFiles).to.equal(2);
    expect(body.data.successfulUploads).to.equal(2);
    expect(body.data.failedUploads).to.equal(0);
    expect(body.data.errors).to.be.an('array').that.is.empty;

    // Verify both translations were created
    const { body: allTranslations } = await session.testAgent
      .get(`/v2/translations?workflowId=${workflowId}`)
      .expect(200);

    expect(allTranslations.total).to.equal(2);
  });

  it('should update existing translation when uploading same locale', async () => {
    const originalContent = { key1: 'original value' };
    const updatedContent = { key1: 'updated value', key2: 'new value' };

    // Upload initial translation
    await session.testAgent
      .post('/v2/translations/upload')
      .field('workflowId', workflowId)
      .attach('files', Buffer.from(JSON.stringify(originalContent)), 'en-US.json')
      .expect(200);

    // Upload updated translation
    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('workflowId', workflowId)
      .attach('files', Buffer.from(JSON.stringify(updatedContent)), 'en-US.json')
      .expect(200);

    expect(body.data.successfulUploads).to.equal(1);

    // Verify the content was updated
    const { body: translation } = await session.testAgent.get(`/v2/translations/${workflowId}/en-US`).expect(200);

    expect(translation.data.content).to.deep.equal(updatedContent);
  });

  it('should handle different filename patterns', async () => {
    const content = { key: 'value' };

    const testCases = [
      { filename: 'en-US.json', expectedLocale: 'en-US' },
      { filename: 'fr-FR.json', expectedLocale: 'fr-FR' },
      { filename: 'de_DE.json', expectedLocale: 'de-DE' },
      { filename: 'it.json', expectedLocale: 'it' },
    ];

    for (const testCase of testCases) {
      const { body } = await session.testAgent
        .post('/v2/translations/upload')
        .field('workflowId', workflowId)
        .attach('files', Buffer.from(JSON.stringify(content)), testCase.filename)
        .expect(200);

      expect(body.data.successfulUploads).to.equal(1);

      // Verify the locale was extracted correctly
      const { body: translation } = await session.testAgent
        .get(`/v2/translations/${workflowId}/${testCase.expectedLocale}`)
        .expect(200);

      expect(translation.data.locale).to.equal(testCase.expectedLocale);
    }
  });

  it('should reject invalid JSON files', async () => {
    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('workflowId', workflowId)
      .attach('files', Buffer.from('invalid json content'), 'en-US.json')
      .expect(200);

    expect(body.data.totalFiles).to.equal(1);
    expect(body.data.successfulUploads).to.equal(0);
    expect(body.data.failedUploads).to.equal(1);
    expect(body.data.errors).to.have.lengthOf(1);
    expect(body.data.errors[0]).to.include('Invalid JSON');
  });

  it('should reject files with invalid locale patterns', async () => {
    const content = { key: 'value' };

    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('workflowId', workflowId)
      .attach('files', Buffer.from(JSON.stringify(content)), 'invalid-filename.json')
      .expect(400);

    expect(body.message).to.equal('Invalid file names');
    expect(body.errors).to.be.an('array').that.is.not.empty;
    expect(body.errors[0]).to.include('invalid-filename.json');
    expect(body.errors[0]).to.include('must be a valid locale filename');
  });

  it('should require workflowId', async () => {
    const content = { key: 'value' };

    await session.testAgent
      .post('/v2/translations/upload')
      .attach('files', Buffer.from(JSON.stringify(content)), 'en-US.json')
      .expect(422);
  });

  it('should reject uploads with invalid filename patterns', async () => {
    const validContent = { key: 'value' };

    // This test should fail at validation level because invalid-name.json has invalid locale pattern
    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('workflowId', workflowId)
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'en-US.json')
      .attach('files', Buffer.from('invalid json'), 'es-ES.json')
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'invalid-name.json')
      .expect(400);

    expect(body.message).to.equal('Invalid file names');
    expect(body.errors).to.be.an('array').that.is.not.empty;
    expect(body.errors[0]).to.include('invalid-name.json');
    expect(body.errors[0]).to.include('must be a valid locale filename');
  });

  it('should handle mixed success and failure uploads with valid filenames', async () => {
    const validContent = { key: 'value' };

    const { body } = await session.testAgent
      .post('/v2/translations/upload')
      .field('workflowId', workflowId)
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'en-US.json')
      .attach('files', Buffer.from('invalid json'), 'es-ES.json')
      .attach('files', Buffer.from(JSON.stringify(validContent)), 'fr-FR.json')
      .expect(200);

    expect(body.data.totalFiles).to.equal(3);
    expect(body.data.successfulUploads).to.equal(2);
    expect(body.data.failedUploads).to.equal(1);
    expect(body.data.errors).to.have.lengthOf(1);
    expect(body.data.errors[0]).to.include('Invalid JSON in file: es-ES.json');
  });
});
