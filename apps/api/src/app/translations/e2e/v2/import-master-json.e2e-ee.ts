import { Novu } from '@novu/api';
import { LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Import master JSON - /v2/translations/master-json (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId1: string;
  let workflowId2: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    // Set organization service level to business to avoid payment required errors
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    novuClient = initNovuClassSdkInternalAuth(session);

    // Create first workflow with translations enabled
    const { result: workflow1 } = await novuClient.workflows.create({
      name: 'User Onboarding Workflow',
      workflowId: `user-onboarding-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'Welcome Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Welcome to our platform',
            body: 'Welcome {{payload.name}}!',
          },
        },
      ],
    });
    workflowId1 = workflow1.workflowId;

    // Create second workflow without translations for testing graceful skipping
    const { result: workflow2 } = await novuClient.workflows.create({
      name: 'No Translation Workflow',
      workflowId: `no-translation-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: false,
      steps: [
        {
          name: 'Simple Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Simple notification',
            body: 'This workflow has no translations',
          },
        },
      ],
    });
    workflowId2 = workflow2.workflowId;
  });

  it('should import master JSON with valid workflows only', async () => {
    const masterJson = {
      workflows: {
        [workflowId1]: {
          'welcome.title': 'Welcome to our platform',
          'welcome.message': 'Hello {{payload.name | upcase}}, welcome aboard!',
          'button.getStarted': 'Get Started',
        },
        [workflowId2]: {
          'disabled.key': 'Content for workflow with translations disabled',
        },
      },
    };

    const response = await novuClient.translations.master.import({
      locale: 'en_US',
      masterJson,
    });

    expect(response.success).to.be.true;
    expect(response.message).to.include('2 resource');

    // Test new response structure
    expect(response.successful).to.be.an('array');
    expect(response.successful).to.have.lengthOf(2);
    expect(response.successful).to.include(workflowId1);
    expect(response.successful).to.include(workflowId2);
    expect(response.failed).to.be.undefined;

    // Verify translation was created for workflow1
    const translation1 = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId1,
      locale: 'en_US',
    });

    expect(translation1.content).to.deep.equal(masterJson.workflows[workflowId1]);

    // Verify translation was created for workflow2 (even though translations disabled)
    const translation2 = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId2,
      locale: 'en_US',
    });

    expect(translation2.content).to.deep.equal(masterJson.workflows[workflowId2]);
  });

  it('should gracefully skip missing workflows but import valid ones', async () => {
    const nonExistentWorkflowId = '507f1f77bcf86cd799439011';
    const masterJson = {
      workflows: {
        [workflowId1]: {
          'valid.key': 'Valid content',
        },
        [nonExistentWorkflowId]: {
          'invalid.key': 'Content for non-existent workflow',
        },
      },
    };

    const response = await novuClient.translations.master.import({
      locale: 'en_US',
      masterJson,
    });

    expect(response.success).to.be.true;
    expect(response.message).to.include('Partial import completed');

    // Test enhanced response structure for partial success
    expect(response.successful).to.be.an('array');
    expect(response.successful).to.have.lengthOf(1);
    expect(response.successful).to.include(workflowId1);

    expect(response.failed).to.be.an('array');
    expect(response.failed).to.have.lengthOf(1);
    expect(response.failed).to.include(nonExistentWorkflowId);

    // Verify valid translation was created
    const translation1 = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId1,
      locale: 'en_US',
    });

    expect(translation1.content).to.deep.equal(masterJson.workflows[workflowId1]);
  });

  it('should handle complete failure gracefully', async () => {
    const nonExistentWorkflowId1 = '507f1f77bcf86cd799439011';
    const nonExistentWorkflowId2 = '507f1f77bcf86cd799439012';
    const masterJson = {
      workflows: {
        [nonExistentWorkflowId1]: {
          'invalid.key1': 'Content for non-existent workflow 1',
        },
        [nonExistentWorkflowId2]: {
          'invalid.key2': 'Content for non-existent workflow 2',
        },
      },
    };

    const response = await novuClient.translations.master.import({
      locale: 'en_US',
      masterJson,
    });

    expect(response.success).to.be.false;
    expect(response.message).to.include('Failed to import any resources');

    // Test response structure for complete failure
    expect(response.successful).to.be.undefined;
    expect(response.failed).to.be.an('array');
    expect(response.failed).to.have.lengthOf(2);
    expect(response.failed).to.include(nonExistentWorkflowId1);
    expect(response.failed).to.include(nonExistentWorkflowId2);
  });

  it('should update existing translations correctly', async () => {
    // Create initial translation
    await novuClient.translations.create({
      resourceId: workflowId1,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: 'en_US',
      content: {
        'old.key': 'Old value',
        'existing.key': 'Will be updated',
      },
    });

    const masterJson = {
      workflows: {
        [workflowId1]: {
          'existing.key': 'Updated value',
          'new.key': 'New value',
        },
      },
    };

    const response = await novuClient.translations.master.import({
      locale: 'en_US',
      masterJson,
    });

    expect(response.success).to.be.true;
    expect(response.successful).to.include(workflowId1);
    expect(response.failed).to.be.undefined;

    // Verify translation was updated (replaces entire content)
    const translation = await novuClient.translations.retrieve({
      resourceType: LocalizationResourceEnum.WORKFLOW,
      resourceId: workflowId1,
      locale: 'en_US',
    });

    expect(translation.content).to.deep.equal(masterJson.workflows[workflowId1]);
    expect(translation.content).to.not.have.property('old.key');
  });

  it('should handle empty master JSON gracefully', async () => {
    const masterJson = {
      workflows: {},
    };

    const response = await novuClient.translations.master.import({
      locale: 'en_US',
      masterJson,
    });

    expect(response.success).to.be.false;
    expect(response.message).to.include('No supported resources found');
    expect(response.successful).to.be.undefined;
    expect(response.failed).to.be.undefined;
  });
});
