import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum, EmailBlockTypeEnum } from '@novu/shared';
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
    expect(body.data.summary).to.have.property('totalEntities');
    expect(body.data.summary).to.have.property('totalDuration');
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

      expect(body.data.summary.totalEntities).to.be.greaterThan(0);
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

      expect(body.data.summary.totalEntities).to.be.greaterThan(0);
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

      expect(body.data.summary.totalEntities).to.be.greaterThan(0);
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

      expect(firstPublish.data.summary.totalEntities).to.be.greaterThan(0);
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
      expect(secondPublish.data.summary.totalEntities).to.be.greaterThan(0);
      expect(secondPublish.data.summary.totalSuccessful).to.equal(0);
      expect(secondPublish.data.summary.totalSkipped).to.be.greaterThan(0);

      // Verify that the workflow result shows it was skipped, not updated
      const workflowResult = secondPublish.data.results.find((result) => result.entityType === 'workflow');
      expect(workflowResult).to.exist;
      expect(workflowResult.successful).to.have.length(0);
      expect(workflowResult.skipped).to.have.length.greaterThan(0);

      const skippedWorkflow = workflowResult.skipped.find(
        (item) => item.entityName === 'Test Workflow for Duplicate Publish'
      );
      expect(skippedWorkflow).to.exist;
      expect(skippedWorkflow.reason).to.contain('No changes detected');
    });
  });

  async function createWorkflow(workflow: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: createWorkflowBody } = await novuClient.workflows.create(workflow);

    return createWorkflowBody;
  }
});
