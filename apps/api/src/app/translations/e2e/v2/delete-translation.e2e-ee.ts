import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete translation - /v2/translations/:workflowId/:locale (DELETE) #novu-v2', async () => {
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

  it('should delete existing translation successfully', async () => {
    const translationContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
      'button.submit': 'Submit',
    };

    // Create translation first
    await session.testAgent
      .post('/v2/translations')
      .send({
        workflowId,
        locale: 'en-US',
        content: translationContent,
      })
      .expect(200);

    // Verify translation exists
    await session.testAgent.get(`/v2/translations/${workflowId}/en-US`).expect(200);

    // Delete the translation
    await session.testAgent.delete(`/v2/translations/${workflowId}/en-US`).expect(204);

    // Verify translation no longer exists
    await session.testAgent.get(`/v2/translations/${workflowId}/en-US`).expect(404);
  });

  it('should return 404 when trying to delete non-existent translation', async () => {
    await session.testAgent.delete(`/v2/translations/${workflowId}/fr-FR`).expect(404);
  });

  it('should return 404 when trying to delete translation for non-existent workflow', async () => {
    const fakeWorkflowId = '507f1f77bcf86cd799439011';

    await session.testAgent.delete(`/v2/translations/${fakeWorkflowId}/en-US`).expect(404);
  });

  it('should validate locale format in URL parameter', async () => {
    await session.testAgent.delete(`/v2/translations/${workflowId}/invalid-locale-123`).expect(400);
  });

  it('should handle underscores in locale and normalize them', async () => {
    const translationContent = {
      'test.key': 'Test value',
    };

    // Create translation with hyphen format
    await session.testAgent
      .post('/v2/translations')
      .send({
        workflowId,
        locale: 'en-US',
        content: translationContent,
      })
      .expect(200);

    // Delete with underscore format (should be normalized to hyphen)
    await session.testAgent.delete(`/v2/translations/${workflowId}/en_US`).expect(204);

    // Verify translation no longer exists
    await session.testAgent.get(`/v2/translations/${workflowId}/en-US`).expect(404);
  });

  it('should delete only the specified locale, leaving others intact', async () => {
    const englishContent = {
      'welcome.title': 'Welcome',
      'welcome.message': 'Hello there!',
    };

    const frenchContent = {
      'welcome.title': 'Bienvenue',
      'welcome.message': 'Bonjour!',
    };

    // Create translations in multiple locales
    await session.testAgent
      .post('/v2/translations')
      .send({
        workflowId,
        locale: 'en-US',
        content: englishContent,
      })
      .expect(200);

    await session.testAgent
      .post('/v2/translations')
      .send({
        workflowId,
        locale: 'fr-FR',
        content: frenchContent,
      })
      .expect(200);

    // Delete only the English translation
    await session.testAgent.delete(`/v2/translations/${workflowId}/en-US`).expect(204);

    // Verify English translation is gone
    await session.testAgent.get(`/v2/translations/${workflowId}/en-US`).expect(404);

    // Verify French translation still exists
    const { body } = await session.testAgent.get(`/v2/translations/${workflowId}/fr-FR`).expect(200);
    expect(body.data.content).to.deep.equal(frenchContent);
  });

  it('should work with complex locale codes', async () => {
    const translationContent = {
      'test.key': 'Chinese Traditional content',
    };

    // Create translation with complex locale
    await session.testAgent
      .post('/v2/translations')
      .send({
        workflowId,
        locale: 'zh-Hans-CN',
        content: translationContent,
      })
      .expect(200);

    // Delete the translation
    await session.testAgent.delete(`/v2/translations/${workflowId}/zh-Hans-CN`).expect(204);

    // Verify translation no longer exists
    await session.testAgent.get(`/v2/translations/${workflowId}/zh-Hans-CN`).expect(404);
  });
});
