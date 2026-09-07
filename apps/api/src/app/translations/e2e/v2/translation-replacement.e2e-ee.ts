import { Novu } from '@novu/api';
import { LayoutCreationSourceEnum } from '@novu/application-generic';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

/**
 * Translation Replacement E2E Tests for V2 Workflows
 *
 * These tests verify that translation keys ({{t.key}}) are correctly replaced with
 * their translated values in workflow step content (subject, body, etc.).
 *
 * We use generatePreview instead of actual workflow delivery because:
 *
 * Actual workflow delivery processes jobs asynchronously through queues. Each step
 * creates separate jobs that execute independently, and execution details are written
 * incrementally (job queued → bridge execution → message created → sent, etc.).
 * This requires polling/waiting for job completion and querying execution details,
 * which may not be immediately available.
 *
 * generatePreview executes synchronously, returning results immediately without jobs
 * or queues. It uses the same translation logic (BaseTranslationRendererUsecase) as
 * actual delivery, ensuring equivalent behavior for testing translation replacement.
 */

describe('Translation Replacement - V2 Workflows #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId: string;
  let emailStepId: string;
  let inAppStepId: string;
  let smsStepId: string;
  let chatStepId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    // Set organization service level to business for enterprise features
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    novuClient = initNovuClassSdkInternalAuth(session);

    // Create workflow with multiple channel types
    const { result: workflow } = await novuClient.workflows.create({
      name: 'Translation Replacement Test Workflow',
      workflowId: `translation-test-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      payloadSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          firstName: { type: 'string' },
          message: { type: 'string' },
          username: { type: 'string' },
          sender: { type: 'string' },
          code: { type: 'string' },
          appleCount: { type: 'number' },
          itemCount: { type: 'number' },
          address: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              country: { type: 'string' },
            },
          },
        },
        additionalProperties: false,
      },
      steps: [
        {
          name: 'Email Step',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Test Email',
            body: '<p>Test content</p>',
          },
        },
        {
          name: 'In-App Step',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test content',
          },
        },
        {
          name: 'SMS Step',
          type: StepTypeEnum.SMS,
          controlValues: {
            body: 'Test SMS',
          },
        },
        {
          name: 'Chat Step',
          type: StepTypeEnum.CHAT,
          controlValues: {
            body: 'Test Chat',
          },
        },
      ],
    });

    workflowId = workflow.workflowId;
    emailStepId = (workflow.steps[0] as any).id;
    inAppStepId = (workflow.steps[1] as any).id;
    smsStepId = (workflow.steps[2] as any).id;
    chatStepId = (workflow.steps[3] as any).id;
  });

  it('simple translation keys replacement', async () => {
    await novuClient.translations.create({
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: {
        greeting: 'Hello',
        closing: 'Thank you',
        'email.subject': 'Welcome to Our Service',
        'email.body.title': 'Getting Started',
        'email.body.content': 'Thanks for joining',
      },
    });

    const { result } = await novuClient.workflows.steps.generatePreview({
      workflowId,
      stepId: emailStepId,
      generatePreviewRequestDto: {
        controlValues: {
          subject: '{{t.email.subject}}',
          body: '<h1>{{t.email.body.title}}</h1><p>{{t.greeting}}! {{t.email.body.content}}. {{t.closing}}!</p>',
        },
      },
    });

    const preview = result.result.preview as any;
    expect(preview.subject).to.equal('Welcome to Our Service');
    expect(preview.body).to.include('Getting Started');
    expect(preview.body).to.include('Hello!');
    expect(preview.body).to.include('Thanks for joining');
    expect(preview.body).to.include('Thank you!');
    expect(preview.body).to.not.include('{{t.');
  });

  describe('Locale Resolution and Fallback', () => {
    it('should use subscriber locale for translation', async () => {
      // Create translations for different locales
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          greeting: 'Hello',
        },
      });

      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: {
          greeting: 'Hola',
        },
      });

      // Preview with Spanish locale
      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.greeting}}</p>',
          },
          previewPayload: {
            subscriber: {
              locale: 'es_ES',
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Hola');
      expect(preview.body).to.not.include('Hello');
    });

    it('should fallback to default locale when subscriber locale not available', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          greeting: 'Hello',
        },
      });

      // Preview with unsupported locale
      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.greeting}}</p>',
          },
          previewPayload: {
            subscriber: {
              locale: 'de_DE', // German not available
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Hello'); // Falls back to en_US
    });

    it('should fallback to default locale when subscriber has no locale', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          greeting: 'Hello',
        },
      });

      // Preview without subscriber locale
      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.greeting}}</p>',
          },
          previewPayload: {
            subscriber: {},
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Hello'); // Falls back to en_US
    });

    it('should use per-key fallback when subscriber locale has partial translations', async () => {
      // Create default locale with all keys
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          greeting: 'Hello',
          farewell: 'Goodbye',
        },
      });

      // Create Spanish locale with only some keys
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: {
          greeting: 'Hola',
          // 'farewell' is missing in Spanish
        },
      });

      // Preview with Spanish locale using both keys
      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.greeting}}, {{t.farewell}}</p>',
          },
          previewPayload: {
            subscriber: {
              locale: 'es_ES',
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Hola'); // Uses Spanish for available key
      expect(preview.body).to.include('Goodbye'); // Falls back to English for missing key
      expect(preview.body).to.not.include('Hello'); // Should not use English for available Spanish key
    });
  });

  describe('Liquid Variables in Translations', () => {
    it('should process liquid variables within translated content', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          personalized: 'Hello {{payload.name}}!',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.personalized}}</p>',
          },
          previewPayload: {
            payload: {
              name: 'John',
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Hello John!');
      expect(preview.body).to.not.include('{{payload.name}}');
    });

    it('should process liquid filters in translated content', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          uppercase: 'Welcome {{payload.name | upcase}}!',
          lowercase: 'Email: {{payload.email | downcase}}',
          capitalize: 'Hello {{payload.firstName | capitalize}}',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.uppercase}} {{t.lowercase}} {{t.capitalize}}</p>',
          },
          previewPayload: {
            payload: {
              name: 'john',
              email: 'JOHN@EXAMPLE.COM',
              firstName: 'mary',
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Welcome JOHN!');
      expect(preview.body).to.include('Email: john@example.com');
      expect(preview.body).to.include('Hello Mary');
    });

    it('should handle nested object access in liquid variables', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          address: 'Shipping to {{payload.address.city}}, {{payload.address.country}}',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.address}}</p>',
          },
          previewPayload: {
            payload: {
              address: {
                city: 'New York',
                country: 'USA',
              },
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Shipping to New York, USA');
    });

    it('should handle pluralize filter with translation keys inside translations', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          appleSingular: 'apple',
          applePlural: 'apples',
          itemSingular: 'item',
          itemPlural: 'items',
          suffix: ' in cart',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: "You have {{payload.appleCount | pluralize: 't.appleSingular', 't.applePlural', 'false'}} and {{payload.itemCount | pluralize: 't.itemSingular', 't.itemPlural', 'false' | append: 't.suffix'}}",
          },
          previewPayload: {
            payload: {
              appleCount: 1,
              itemCount: 5,
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('You have apple and items in cart');
      expect(preview.body).to.include('apple'); // Singular for count=1
      expect(preview.body).to.include('items'); // Plural for count=5
      expect(preview.body).to.not.include('apples'); // Should not use plural for count=1
      expect(preview.body).to.not.include('item '); // Should not use singular for count=5
    });

    it('should render empty string for missing payload variables (consistent with non-translated content)', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          personalized: 'Hello {{payload.missingVar}}!',
          withMultiple: 'First: {{payload.undefinedField}}, Second: {{payload.notInSchema}}',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.personalized}}</p><p>{{t.withMultiple}}</p>',
          },
          previewPayload: {
            payload: {
              // missingVar, undefinedField, and notInSchema are not defined
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Hello !'); // Missing variable renders as empty string
      expect(preview.body).to.include('First: , Second: '); // Both missing render as empty strings
      expect(preview.body).to.not.include('{{payload.'); // Variables should be processed
    });
  });

  describe('Layout Translations', () => {
    it('should replace translation keys in layout content when used in workflow step', async () => {
      // Create layout
      const { result: layout } = await novuClient.layouts.create({
        layoutId: `layout-translation-${Date.now()}`,
        name: 'Layout Translation Test',
        source: LayoutCreationSourceEnum.DASHBOARD,
      });

      // Update layout with translation enabled and layout content
      await novuClient.layouts.update(
        {
          name: 'Layout Translation Test',
          isTranslationEnabled: true,
          controlValues: {
            email: {
              body: `
                <html>
                  <head><title>Layout Translation Test</title></head>
                  <body>
                    <div>{{content}}</div>
                    <footer>
                      <p>Footer: {{t.layout.footer}}</p>
                    </footer>
                  </body>
                </html>
              `,
              editorType: 'html',
            },
          },
        },
        layout.layoutId
      );

      // Create layout translations
      await novuClient.translations.create({
        resourceId: layout.layoutId,
        resourceType: LocalizationResourceEnum.LAYOUT,
        locale: 'en_US',
        content: {
          'layout.footer': '© 2024 Our Company',
        },
      });

      // Create workflow step that uses the layout
      const { result: workflow } = await novuClient.workflows.create({
        name: 'Layout Translation Workflow',
        workflowId: `layout-workflow-${Date.now()}`,
        source: WorkflowCreationSourceEnum.EDITOR,
        active: true,
        isTranslationEnabled: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test',
              body: '<p>Workflow content</p>',
              layoutId: layout.layoutId,
            },
          },
        ],
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId: workflow.workflowId,
        stepId: (workflow.steps[0] as any).id,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>Workflow content</p>',
            layoutId: layout.layoutId,
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('© 2024 Our Company');
      expect(preview.body).to.include('Workflow content');
      expect(preview.body).to.not.include('{{t.layout.footer}}');
    });
  });

  describe('Different Channel Types', () => {
    it('should replace translations in in-app notifications', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'inapp.subject': 'New Notification',
          'inapp.body': 'You have a new message from {{payload.sender}}',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: inAppStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: '{{t.inapp.subject}}',
            body: '{{t.inapp.body}}',
          },
          previewPayload: {
            payload: {
              sender: 'Admin',
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.subject).to.equal('New Notification');
      expect(preview.body).to.include('You have a new message from Admin');
    });

    it('should replace translations in SMS messages', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'sms.message': 'Your code is {{payload.code}}',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: smsStepId,
        generatePreviewRequestDto: {
          controlValues: {
            body: '{{t.sms.message}}',
          },
          previewPayload: {
            payload: {
              code: '123456',
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.equal('Your code is 123456');
    });

    it('should replace translations in chat messages', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'chat.message': 'New message: {{payload.message}}',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: chatStepId,
        generatePreviewRequestDto: {
          controlValues: {
            body: '{{t.chat.message}}',
          },
          previewPayload: {
            payload: {
              message: 'Hello from chat!',
            },
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.equal('New message: Hello from chat!');
    });
  });

  describe('Escaped Characters in Translations', () => {
    it('should handle translations with escaped quotes', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          quoted: 'Welcome to "Our Service" - You\'re all set!',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: '{{t.quoted}}',
            body: '<p>Test</p>',
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.subject).to.include('"Our Service"');
      expect(preview.subject).to.include("You're all set!");
      expect(preview.subject).to.not.include('\\"');
      expect(preview.subject).to.not.include("\\'");
    });

    it('should handle translations with newlines and special characters', async () => {
      await novuClient.translations.create({
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          multiline: 'Line 1\nLine 2\tTabbed content',
        },
      });

      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId,
        stepId: emailStepId,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.multiline}}</p>',
          },
        },
      });

      const preview = result.result.preview as any;
      expect(preview.body).to.include('Line 1');
      expect(preview.body).to.include('Line 2');
      expect(preview.body).to.not.include('\\n');
      expect(preview.body).to.not.include('\\t');
    });
  });

  describe('Error Handling', () => {
    /*
     * Note: These tests use generatePreview instead of actual workflow delivery.
     * PreviewUsecase gracefully handles translation errors by catching exceptions
     * and returning an empty preview object ({}) for UI stability (questionable choice).
     * An empty preview (where subject and body are undefined) indicates that a translation error occurred.
     *
     * TODO: To actually see the error messages from bridge execution (e.g., "Translation is not enabled
     * for this resource", "Missing translation for key 'xyz'"), we should either:
     * 1. Rework these tests to use actual workflow delivery (novuClient.trigger) and check execution
     *    details for bridge execution failures, OR
     * 2. Rework generatePreview to return errors instead of silently returning empty preview objects.
     * This would provide more detailed error information than empty preview objects.
     */
    it('should return empty preview when translation keys used but translation not enabled for resource', async () => {
      // Create workflow with translation explicitly disabled
      const { result: workflow } = await novuClient.workflows.create({
        name: 'No Translation Workflow',
        workflowId: `no-translation-${Date.now()}`,
        source: WorkflowCreationSourceEnum.EDITOR,
        active: true,
        isTranslationEnabled: false, // Disabled
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test',
              body: '<p>{{t.greeting}}</p>', // Using translation key when disabled
            },
          },
        ],
      });

      // generatePreview catches translation errors and returns empty object
      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId: workflow.workflowId,
        stepId: (workflow.steps[0] as any).id,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.greeting}}</p>',
          },
        },
      });

      // Empty preview (undefined subject/body) indicates translation error occurred
      const preview = result.result.preview as any;
      expect(preview).to.be.an('object');
      expect(preview.subject).to.be.undefined;
      expect(preview.body).to.be.undefined;
    });

    it('should return empty preview for missing translation key', async () => {
      // Create workflow with translation enabled
      const { result: workflow } = await novuClient.workflows.create({
        name: 'Missing Translation Key Workflow',
        workflowId: `missing-key-${Date.now()}`,
        source: WorkflowCreationSourceEnum.EDITOR,
        active: true,
        isTranslationEnabled: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test',
              body: '<p>{{t.missingKey}}</p>', // Key doesn't exist
            },
          },
        ],
      });

      // Create translation with wrong key (missing 'missingKey')
      await novuClient.translations.create({
        resourceId: workflow.workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          existingKey: 'This exists',
        },
      });

      // generatePreview catches missing translation key errors and returns empty object
      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId: workflow.workflowId,
        stepId: (workflow.steps[0] as any).id,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.missingKey}}</p>',
          },
        },
      });

      // Empty preview (undefined subject/body) indicates missing translation key error
      const preview = result.result.preview as any;
      expect(preview).to.be.an('object');
      expect(preview.subject).to.be.undefined;
      expect(preview.body).to.be.undefined;
    });

    it('should return empty preview when translations not created but translation keys used', async () => {
      // Create workflow with translation enabled but no translations created
      const { result: workflow } = await novuClient.workflows.create({
        name: 'No Translations Created',
        workflowId: `no-translations-created-${Date.now()}`,
        source: WorkflowCreationSourceEnum.EDITOR,
        active: true,
        isTranslationEnabled: true, // Enabled but no translations created
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test',
              body: '<p>{{t.greeting}}</p>', // Translation key but no translations exist
            },
          },
        ],
      });

      // generatePreview catches "no translations found" errors and returns empty object
      const { result } = await novuClient.workflows.steps.generatePreview({
        workflowId: workflow.workflowId,
        stepId: (workflow.steps[0] as any).id,
        generatePreviewRequestDto: {
          controlValues: {
            subject: 'Test',
            body: '<p>{{t.greeting}}</p>',
          },
        },
      });

      // Empty preview (undefined subject/body) indicates no translations found error
      const preview = result.result.preview as any;
      expect(preview).to.be.an('object');
      expect(preview.subject).to.be.undefined;
      expect(preview.body).to.be.undefined;
    });
  });
});

describe('Translation Feature Access - V2 Workflows #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;

  it('should throw PaymentRequired error when organization lacks translation feature', async () => {
    session = new UserSession();
    await session.initialize();

    // Keep organization at FREE tier (no BUSINESS upgrade)
    novuClient = initNovuClassSdkInternalAuth(session);

    // Attempt to create workflow with translation enabled on FREE tier
    try {
      await novuClient.workflows.create({
        name: 'Translation Test Workflow',
        workflowId: `translation-free-tier-${Date.now()}`,
        source: WorkflowCreationSourceEnum.EDITOR,
        active: true,
        isTranslationEnabled: true, // This should fail on FREE tier
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test Email',
              body: '<p>Test content</p>',
            },
          },
        ],
      });

      expect.fail('Should have thrown PaymentRequired error');
    } catch (error: any) {
      expect(error.statusCode).to.equal(402);
      expect(error.message).to.match(/payment required|not available on your plan/i);
    }
  });
});
