import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Upload translation files - /v2/translations/upload (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    // Set organization service level to business to avoid payment required errors
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    /*
     * Configure organization locales with a more minimal set
     * Only configure locales that are commonly used across tests
     */
    await session.testAgent
      .patch('/v1/organizations/settings')
      .send({
        defaultLocale: 'en_US',
        targetLocales: ['es_ES', 'fr_FR', 'de_DE', 'it_IT'], // Include all locales that might be used in tests
      })
      .expect(200);

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

  it('should upload single translation file', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
      'button.submit': 'Submit',
    };

    const response = await novuClient.translations.upload({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      files: [
        {
          fileName: 'en_US.json',
          content: Buffer.from(JSON.stringify(translationContent)),
        },
      ],
    });

    expect(response.totalFiles).to.equal(1);
    expect(response.successfulUploads).to.equal(1);
    expect(response.failedUploads).to.equal(0);
    expect(response.errors).to.be.an('array').that.is.empty;

    // Verify the translation was created
    const translation = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    expect(translation.content).to.deep.equal(translationContent);
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

    const response = await novuClient.translations.upload({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      files: [
        {
          fileName: 'en_US.json',
          content: Buffer.from(JSON.stringify(enContent)),
        },
        {
          fileName: 'es_ES.json',
          content: Buffer.from(JSON.stringify(esContent)),
        },
      ],
    });

    expect(response.totalFiles).to.equal(2);
    expect(response.successfulUploads).to.equal(2);
    expect(response.failedUploads).to.equal(0);
    expect(response.errors).to.be.an('array').that.is.empty;

    // Verify both translations were created
    const translationGroup = await novuClient.translations.groups.retrieve(
      LocalizationResourceEnum.WORKFLOW,
      workflowId
    );

    /*
     * The locales should include configured locales plus any uploaded locales
     * Configured: en_US (default), es_ES, fr_FR, de_DE, it_IT (targets)
     */
    expect(translationGroup.locales).to.have.lengthOf(5);
    expect(translationGroup.locales).to.include('en_US');
    expect(translationGroup.locales).to.include('es_ES');
    expect(translationGroup.locales).to.include('fr_FR');
    expect(translationGroup.locales).to.include('de_DE');
    expect(translationGroup.locales).to.include('it_IT');
  });

  it('should update existing translation when uploading same locale', async () => {
    const originalContent = { key1: 'original value' };
    const updatedContent = { key1: 'updated value', key2: 'new value' };

    // Upload initial translation
    await novuClient.translations.upload({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      files: [
        {
          fileName: 'en_US.json',
          content: Buffer.from(JSON.stringify(originalContent)),
        },
      ],
    });

    // Upload updated translation
    const response = await novuClient.translations.upload({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      files: [
        {
          fileName: 'en_US.json',
          content: Buffer.from(JSON.stringify(updatedContent)),
        },
      ],
    });

    expect(response.successfulUploads).to.equal(1);

    // Verify the content was updated
    const translation = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId,
      locale: 'en_US',
    });

    expect(translation.content).to.deep.equal(updatedContent);
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
      const response = await novuClient.translations.upload({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        files: [
          {
            fileName: testCase.filename,
            content: Buffer.from(JSON.stringify(content)),
          },
        ],
      });

      expect(response.successfulUploads).to.equal(1);

      // Verify the locale was extracted correctly
      const translation = await novuClient.translations.retrieve({
        resourceType: LocalizationResourceEnum.WORKFLOW,
        resourceId: workflowId,
        locale: testCase.expectedLocale,
      });

      expect(translation.locale).to.equal(testCase.expectedLocale);
    }
  });

  it('should reject invalid JSON files', async () => {
    try {
      await novuClient.translations.upload({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        files: [
          {
            fileName: 'en_US.json',
            content: Buffer.from('invalid json content'),
          },
        ],
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('No valid translation files were found');
    }
  });

  it('should reject files with invalid locale patterns', async () => {
    const content = { key: 'value' };

    try {
      await novuClient.translations.upload({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        files: [
          {
            fileName: 'invalid-filename.json',
            content: Buffer.from(JSON.stringify(content)),
          },
        ],
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('invalid names or formats');
      const errorBody = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
      expect(errorBody.errors).to.be.an('array').that.is.not.empty;
      expect(errorBody.errors[0]).to.include('invalid-filename.json');
    }
  });

  it('should reject uploads with invalid filename patterns', async () => {
    const validContent = { key: 'value' };

    // This test should fail at validation level because invalid-name.json has invalid locale pattern
    try {
      await novuClient.translations.upload({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        files: [
          {
            fileName: 'en_US.json',
            content: Buffer.from(JSON.stringify(validContent)),
          },
          {
            fileName: 'es_ES.json',
            content: Buffer.from('invalid json'),
          },
          {
            fileName: 'invalid-name.json',
            content: Buffer.from(JSON.stringify(validContent)),
          },
        ],
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('invalid names or formats');
      const errorBody = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
      expect(errorBody.errors).to.be.an('array').that.is.not.empty;
      expect(errorBody.errors[0]).to.include('invalid-name.json');
    }
  });

  it('should handle mixed success and failure uploads with valid filenames', async () => {
    const validContent = { key: 'value' };

    const response = await novuClient.translations.upload({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      files: [
        {
          fileName: 'en_US.json',
          content: Buffer.from(JSON.stringify(validContent)),
        },
        {
          fileName: 'es_ES.json',
          content: Buffer.from('invalid json'),
        },
        {
          fileName: 'fr_FR.json',
          content: Buffer.from(JSON.stringify(validContent)),
        },
      ],
    });

    expect(response.totalFiles).to.equal(3);
    expect(response.successfulUploads).to.equal(2);
    expect(response.failedUploads).to.equal(1);
    expect(response.errors).to.have.lengthOf(1);
    expect(response.errors[0]).to.include("Failed to process file 'es_ES.json'");
  });

  it('should reject uploads for locales not configured in organization settings', async () => {
    const validContent = { key: 'value' };

    /*
     * Try to upload a locale that is not in the configured locales
     * Configured locales are: en_US (default), es_ES, fr_FR, de_DE, it_IT
     */
    try {
      await novuClient.translations.upload({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        files: [
          {
            fileName: 'ja_JP.json', // Japanese not configured
            content: Buffer.from(JSON.stringify(validContent)),
          },
        ],
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.include('The following locales are not configured for your organization: ja_JP');
      expect(error.message).to.include('Please add these locales in your translation settings');
      expect(error.message).to.include('configured locales: en_US, es_ES, fr_FR, de_DE, it_IT');
    }
  });
});
