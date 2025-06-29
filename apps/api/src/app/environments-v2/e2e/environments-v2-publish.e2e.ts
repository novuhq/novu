import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum, EmailBlockTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/api/models/components';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Environment Publish - /v2/environments/publish (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();
  const workflowRepository = new NotificationTemplateRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  it('should return validation error for same source and target environment', async () => {
    const { body } = await session.testAgent
      .post('/v2/environments/publish')
      .send({
        sourceEnvironmentId: session.environment._id,
        targetEnvironmentId: session.environment._id,
      })
      .expect(400);

    expect(body.message).to.contain('Source and target environments cannot be the same');
  });

  it('should return validation error for invalid environment IDs', async () => {
    const { body } = await session.testAgent
      .post('/v2/environments/publish')
      .send({
        sourceEnvironmentId: 'invalid-id',
        targetEnvironmentId: 'another-invalid-id',
      })
      .expect(400);

    expect(body.message).to.contain('Invalid environment ID format');
  });

  it('should perform dry run successfully', async () => {
    // Get the production environment (automatically created with the session)
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    const { body } = await session.testAgent
      .post('/v2/environments/publish')
      .send({
        sourceEnvironmentId: session.environment._id,
        targetEnvironmentId: prodEnv._id,
        dryRun: true,
      })
      .expect(200);

    expect(body.data).to.have.property('results');
    expect(body.data).to.have.property('summary');
    expect(body.data.summary).to.have.property('resources');
  });

  describe('Workflow Publishing Tests', () => {
    let sourceEnv: any;
    let targetEnv: any;

    beforeEach(async () => {
      // Use the existing development environment as source
      sourceEnv = session.environment;

      // Use the existing production environment as target
      targetEnv = await environmentRepository.findOne({
        _parentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      if (!targetEnv) {
        throw new Error('Production environment not found');
      }
    });

    it('should create new workflow in target environment when publishing', async () => {
      // Create a workflow in source environment using the v2 API
      const sourceWorkflow = await createWorkflow({
        name: 'Test Workflow for Creation',
        workflowId: `test-create-trigger-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test Email Subject',
              body: 'Test email content',
            },
          },
        ],
      });

      // Publish from source to target (not dry run)
      const { body } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(body.data.summary.resources).to.be.greaterThan(0);
      expect(body.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify workflow was created in target environment
      const targetWorkflows = await workflowRepository.find({
        _environmentId: targetEnv._id,
        _organizationId: session.organization._id,
        'triggers.identifier': sourceWorkflow.workflowId,
      });

      expect(targetWorkflows).to.have.length(1);
      const targetWorkflow = targetWorkflows[0];
      expect(targetWorkflow.name).to.equal('Test Workflow for Creation');
      expect(targetWorkflow.triggers[0].identifier).to.equal(sourceWorkflow.workflowId);
      expect(targetWorkflow.steps).to.have.length(1);
      /*
       * Note: v2 workflows store control values differently than v1 templates
       * The subject is stored in the rawData for v2 workflows
       */
    });

    it('should handle multiple workflows during publishing', async () => {
      // Create multiple workflows in source using v2 API
      const workflow1 = await createWorkflow({
        name: 'Workflow One',
        workflowId: `workflow-one-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      const workflow2 = await createWorkflow({
        name: 'Workflow Two',
        workflowId: `workflow-two-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      // Publish workflows
      const { body } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(body.data.summary.resources).to.be.greaterThan(0);
      expect(body.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify both workflows were published to target
      const targetWorkflow1 = await workflowRepository.find({
        _environmentId: targetEnv._id,
        _organizationId: session.organization._id,
        'triggers.identifier': workflow1.workflowId,
      });

      const targetWorkflow2 = await workflowRepository.find({
        _environmentId: targetEnv._id,
        _organizationId: session.organization._id,
        'triggers.identifier': workflow2.workflowId,
      });

      expect(targetWorkflow1).to.have.length(1);
      expect(targetWorkflow2).to.have.length(1);
      expect(targetWorkflow1[0].name).to.equal('Workflow One');
      expect(targetWorkflow2[0].name).to.equal('Workflow Two');
    });

    it('should handle workflow with multiple steps during publishing', async () => {
      // Create workflow with multiple steps using v2 API
      const multiStepWorkflow = await createWorkflow({
        name: 'Multi-Step Workflow',
        workflowId: `multi-step-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Welcome Email',
              body: 'Welcome to our platform!',
            },
          },
          {
            name: 'In-App Step',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              body: 'You have a new notification',
            },
          },
        ],
      });

      // Publish workflow
      const { body } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(body.data.summary.resources).to.be.greaterThan(0);
      expect(body.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify workflow structure is preserved
      const targetWorkflows = await workflowRepository.find({
        _environmentId: targetEnv._id,
        _organizationId: session.organization._id,
        'triggers.identifier': multiStepWorkflow.workflowId,
      });

      expect(targetWorkflows).to.have.length(1);
      const targetWorkflow = targetWorkflows[0];
      expect(targetWorkflow.name).to.equal('Multi-Step Workflow');
      expect(targetWorkflow.steps).to.have.length(2);
    });

    it('should not report workflows as updated when no changes are made on second publish', async () => {
      // Create a workflow in source environment using the v2 API
      const sourceWorkflow = await createWorkflow({
        name: 'Test Workflow for Duplicate Publish',
        workflowId: `test-duplicate-publish-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test Email Subject',
              body: 'Test email content',
            },
          },
        ],
      });

      // First publish from source to target
      const { body: firstPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(firstPublish.data.summary.resources).to.be.greaterThan(0);
      expect(firstPublish.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Second publish without any changes - should not report workflows as updated
      const { body: secondPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      /*
       * The issue: currently this fails because workflows are always reported as "updated"
       * even when no changes were made
       */
      expect(secondPublish.data.summary.resources).to.be.greaterThan(0);
      expect(secondPublish.data.summary.totalSuccessful).to.equal(0);
      expect(secondPublish.data.summary.totalSkipped).to.be.greaterThan(0);

      // Verify that the workflow result shows it was skipped, not updated
      const workflowResult = secondPublish.data.results.find((result) => result.resourceType === 'workflow');
      expect(workflowResult).to.exist;
      expect(workflowResult.successful).to.have.length(0);
      expect(workflowResult.skipped).to.have.length.greaterThan(0);

      const skippedWorkflow = workflowResult.skipped.find(
        (item) => item.resourceName === 'Test Workflow for Duplicate Publish'
      );
      expect(skippedWorkflow).to.exist;
      expect(skippedWorkflow.reason).to.contain('No changes detected');
    });

    it('should properly publish workflow changes when workflow is modified', async () => {
      // Create a workflow in source environment using the v2 API
      const sourceWorkflow = await createWorkflow({
        name: 'Test Workflow for Control Values Update',
        workflowId: `test-control-values-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'In-App Step',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              body: 'Original in-app message',
            },
          },
        ],
      });

      expect(sourceWorkflow).to.exist;
      expect(sourceWorkflow.workflowId).to.exist;

      // First publish from source to target
      const { body: firstPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(firstPublish.data.summary.resources).to.be.greaterThan(0);
      expect(firstPublish.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify initial workflow was created in target environment
      const initialTargetWorkflows = await workflowRepository.find({
        _environmentId: targetEnv._id,
        _organizationId: session.organization._id,
        'triggers.identifier': sourceWorkflow.workflowId,
      });

      expect(initialTargetWorkflows).to.have.length(1);
      const initialTargetWorkflow = initialTargetWorkflows[0];
      expect(initialTargetWorkflow.name).to.equal('Test Workflow for Control Values Update');

      // Update the workflow in source environment with new control values using patch
      const { result: updatedWorkflow } = await novuClient.workflows.patch(
        {
          name: 'Test Workflow for Control Values Update - Modified',
        },
        sourceWorkflow.workflowId
      );

      expect(updatedWorkflow).to.exist;

      // Publish the updated workflow from source to target
      const { body: secondPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(secondPublish.data.summary.resources).to.be.greaterThan(0);
      expect(secondPublish.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify that the workflow result shows it was updated, not skipped
      const workflowResult = secondPublish.data.results.find((result) => result.resourceType === 'workflow');
      expect(workflowResult).to.exist;
      expect(workflowResult.successful).to.have.length.greaterThan(0);

      const updatedWorkflowResult = workflowResult.successful.find(
        (item) => item.resourceName === 'Test Workflow for Control Values Update - Modified'
      );
      expect(updatedWorkflowResult).to.exist;
      expect(updatedWorkflowResult.action).to.equal('updated');

      // Switch to target environment to verify the control values were updated
      const originalEnvironmentId = session.environment._id;
      session.environment._id = targetEnv._id;

      try {
        // Use SDK to retrieve the updated workflow from target environment
        const { result: updatedTargetWorkflow } = await novuClient.workflows.get(sourceWorkflow.workflowId);

        expect(updatedTargetWorkflow).to.exist;
        expect(updatedTargetWorkflow.name).to.equal('Test Workflow for Control Values Update - Modified');
        expect(updatedTargetWorkflow.steps).to.have.length(1);

        const targetStep = updatedTargetWorkflow.steps[0];
        expect(targetStep.name).to.equal('In-App Step');
      } finally {
        // Restore original environment
        session.environment._id = originalEnvironmentId;
      }
    });

    it('should properly publish updated control values when workflow control values are modified', async () => {
      // Create a workflow in source environment using the v2 API
      const sourceWorkflow = await createWorkflow({
        name: 'Test Workflow for Control Values Update',
        workflowId: `test-control-values-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'In-App Step',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              body: 'Original in-app message',
            },
          },
        ],
      });

      expect(sourceWorkflow).to.exist;
      expect(sourceWorkflow.workflowId).to.exist;

      // First publish from source to target
      const { body: firstPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(firstPublish.data.summary.resources).to.be.greaterThan(0);
      expect(firstPublish.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify initial workflow was created in target environment
      const originalEnvironmentId = session.environment._id;
      session.environment._id = targetEnv._id;

      try {
        const { result: initialTargetWorkflow } = await novuClient.workflows.get(sourceWorkflow.workflowId);
        expect(initialTargetWorkflow).to.exist;
        expect(initialTargetWorkflow.name).to.equal('Test Workflow for Control Values Update');
        expect(initialTargetWorkflow.steps).to.have.length(1);
        expect((initialTargetWorkflow.steps[0].controls.values as any).body).to.equal('Original in-app message');
      } finally {
        // Restore original environment
        session.environment._id = originalEnvironmentId;
      }

      // Update the workflow control values in source environment using the full update method
      const { result: updatedWorkflow } = await novuClient.workflows.update(
        {
          name: sourceWorkflow.name,
          description: sourceWorkflow.description,
          tags: sourceWorkflow.tags || [],
          active: sourceWorkflow.active,
          steps: [
            {
              id: sourceWorkflow.steps[0].id,
              name: sourceWorkflow.steps[0].name,
              type: StepTypeEnum.IN_APP,
              controlValues: {
                body: 'Updated in-app message with new content',
              },
            } as any,
          ],
          preferences: {
            user: {
              all: { enabled: true, readOnly: false },
              channels: {
                email: { enabled: true },
                sms: { enabled: true },
                in_app: { enabled: true },
                chat: { enabled: true },
                push: { enabled: true },
              },
            },
          },
          origin: ResourceOriginEnum.NOVU_CLOUD,
        },
        sourceWorkflow.workflowId
      );

      expect(updatedWorkflow).to.exist;

      // Publish the updated workflow from source to target
      const { body: secondPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(secondPublish.data.summary.resources).to.be.greaterThan(0);
      expect(secondPublish.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify that the workflow result shows it was updated, not skipped
      const workflowResult = secondPublish.data.results.find((result) => result.resourceType === 'workflow');
      expect(workflowResult).to.exist;
      expect(workflowResult.successful).to.have.length.greaterThan(0);

      const updatedWorkflowResult = workflowResult.successful.find(
        (item) => item.resourceName === 'Test Workflow for Control Values Update'
      );
      expect(updatedWorkflowResult).to.exist;
      expect(updatedWorkflowResult.action).to.equal('updated');

      // Switch to target environment to verify the control values were updated
      session.environment._id = targetEnv._id;

      try {
        // Use SDK to retrieve the updated workflow from target environment
        const { result: finalTargetWorkflow } = await novuClient.workflows.get(sourceWorkflow.workflowId);

        expect(finalTargetWorkflow).to.exist;
        expect(finalTargetWorkflow.name).to.equal('Test Workflow for Control Values Update');
        expect(finalTargetWorkflow.steps).to.have.length(1);

        const targetStep = finalTargetWorkflow.steps[0];
        expect(targetStep.name).to.equal('In-App Step');

        // Verify the control values were properly updated
        expect((targetStep.controls.values as any).body).to.equal('Updated in-app message with new content');
      } finally {
        // Restore original environment
        session.environment._id = originalEnvironmentId;
      }
    });

    it('should delete workflows from target environment when they are removed from source', async () => {
      // Create a workflow in source environment using the v2 API
      const sourceWorkflow = await createWorkflow({
        name: 'Test Workflow for Deletion',
        workflowId: `test-deletion-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test Email Subject',
              body: 'Test email content',
            },
          },
        ],
      });

      // First publish from source to target to create the workflow
      const { body: firstPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(firstPublish.data.summary.resources).to.be.greaterThan(0);
      expect(firstPublish.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify workflow was created in target environment
      const targetWorkflowsAfterCreate = await workflowRepository.find({
        _environmentId: targetEnv._id,
        _organizationId: session.organization._id,
        'triggers.identifier': sourceWorkflow.workflowId,
      });

      expect(targetWorkflowsAfterCreate).to.have.length(1);
      expect(targetWorkflowsAfterCreate[0].name).to.equal('Test Workflow for Deletion');

      // Delete the workflow from source environment
      await novuClient.workflows.delete(sourceWorkflow.workflowId);

      // Publish again - this should delete the workflow from target environment
      const { body: secondPublish } = await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: sourceEnv._id,
          targetEnvironmentId: targetEnv._id,
          dryRun: false,
        })
        .expect(200);

      expect(secondPublish.data.summary.resources).to.be.greaterThan(0);
      expect(secondPublish.data.summary.totalSuccessful).to.be.greaterThan(0);

      // Verify that the workflow result shows it was deleted
      const workflowResult = secondPublish.data.results.find((result) => result.resourceType === 'workflow');
      expect(workflowResult).to.exist;
      expect(workflowResult.successful).to.have.length.greaterThan(0);

      const deletedWorkflowResult = workflowResult.successful.find(
        (item) => item.resourceName === 'Test Workflow for Deletion'
      );
      expect(deletedWorkflowResult).to.exist;
      expect(deletedWorkflowResult.action).to.equal('deleted');

      // Verify workflow was deleted from target environment
      const targetWorkflowsAfterDelete = await workflowRepository.find({
        _environmentId: targetEnv._id,
        _organizationId: session.organization._id,
        'triggers.identifier': sourceWorkflow.workflowId,
      });

      expect(targetWorkflowsAfterDelete).to.have.length(0);
    });
  });

  async function createWorkflow(workflow: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: createWorkflowBody } = await novuClient.workflows.create(workflow);

    return createWorkflowBody;
  }
});
