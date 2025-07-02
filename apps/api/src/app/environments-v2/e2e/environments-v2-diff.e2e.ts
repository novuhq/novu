import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/api/models/components';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Environment Diff - /v2/environments/diff (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();
  const workflowRepository = new NotificationTemplateRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  async function getProductionEnvironment() {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    return prodEnv;
  }

  async function createWorkflow(workflow: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: createWorkflowBody } = await novuClient.workflows.create(workflow);

    return createWorkflowBody;
  }

  describe('Error Handling', () => {
    it('should return 400 when source and target environments are the same', async () => {
      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.equal('Source and target environments cannot be the same');
    });

    it('should return 400 when source environment ID is invalid', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: 'invalid-id',
          targetEnvironmentId: prodEnv._id,
        })
        .expect(400);

      expect(body.message).to.equal('Invalid environment ID format');
    });

    it('should return 400 when target environment ID is invalid', async () => {
      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: 'invalid-id',
        })
        .expect(400);

      expect(body.message).to.equal('Invalid environment ID format');
    });

    it('should return 400 when source environment does not exist', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: '507f1f77bcf86cd799439011',
          targetEnvironmentId: prodEnv._id,
        })
        .expect(400);

      expect(body.message).to.equal('Source environment not found');
    });

    it('should return 400 when target environment does not exist', async () => {
      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: '507f1f77bcf86cd799439011',
        })
        .expect(400);

      expect(body.message).to.equal('Target environment not found');
    });
  });

  describe('Diff Detection Tests', () => {
    it('should detect added workflows', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create a workflow in source environment
      await createWorkflow({
        name: 'New Workflow for Diff',
        workflowId: `new-diff-workflow-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'New workflow subject',
              body: 'New workflow body',
            },
          },
        ],
      });

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      expect(body.data.summary.hasChanges).to.be.true;
      expect(body.data.summary.totalChanges).to.be.greaterThan(0);
      expect(body.data.resources).to.have.length(1);
      expect(body.data.resources[0].resourceType).to.equal('workflow');
      expect(body.data.resources[0].sourceResourceName).to.equal('New Workflow for Diff');
      expect(body.data.resources[0].summary.added).to.be.greaterThan(0);

      // Find the added workflow in the diff
      const addedWorkflow = body.data.resources[0].changes.find(
        (diff: any) => diff.action === 'added' && diff.sourceResourceName === 'New Workflow for Diff'
      );
      expect(addedWorkflow).to.exist;
      expect(addedWorkflow.sourceResourceId).to.exist;
    });

    it('should detect modified workflows', async () => {
      const prodEnv = await getProductionEnvironment();
      const workflowId = `modified-diff-workflow-${Date.now()}`;

      // Create and publish a workflow
      const workflow = await createWorkflow({
        name: 'Original Workflow Name',
        workflowId,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
          dryRun: false,
        })
        .expect(200);

      // Update the workflow in source
      await novuClient.workflows.patch(
        {
          name: 'Modified Workflow Name',
          description: 'Modified description',
        },
        workflow.id
      );

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      expect(body.data.summary.hasChanges).to.be.true;
      expect(body.data.summary.totalChanges).to.be.greaterThan(0);

      // Find the modified workflow in the diff - now each workflow has its own result
      const modifiedWorkflowResult = body.data.resources.find(
        (result: any) => result.sourceResourceName === 'Modified Workflow Name'
      );
      expect(modifiedWorkflowResult).to.exist;

      const modifiedWorkflow = modifiedWorkflowResult.changes.find((diff: any) => diff.action === 'modified');
      expect(modifiedWorkflow).to.exist;
      expect(modifiedWorkflow.diffs).to.exist;
    });

    it('should detect deleted workflows', async () => {
      const prodEnv = await getProductionEnvironment();
      const workflowId = `deleted-diff-workflow-${Date.now()}`;

      // Create and publish a workflow
      const workflow = await createWorkflow({
        name: 'Workflow to Delete',
        workflowId,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
          dryRun: false,
        })
        .expect(200);

      // Delete the workflow from source
      await novuClient.workflows.delete(workflow.id);

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      expect(body.data.summary.hasChanges).to.be.true;
      expect(body.data.summary.totalChanges).to.be.greaterThan(0);

      // Find the deleted workflow in the diff - now each workflow has its own result
      const deletedWorkflowResult = body.data.resources.find(
        (result: any) => result.targetResourceName === 'Workflow to Delete'
      );
      expect(deletedWorkflowResult).to.exist;

      const deletedWorkflow = deletedWorkflowResult.changes.find((diff: any) => diff.action === 'deleted');
      expect(deletedWorkflow).to.exist;
    });

    it('should handle diff with inactive workflows', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create an inactive workflow
      await createWorkflow({
        name: 'Inactive Workflow for Diff',
        workflowId: `inactive-diff-workflow-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: false,
        steps: [],
      });

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      expect(body.data).to.have.property('resources');
      expect(body.data).to.have.property('summary');
    });

    it('should provide comprehensive diff summary', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      // Each workflow gets its own resource entry now
      expect(body.data.resources).to.be.an('array');
      if (body.data.resources.length > 0) {
        const workflowResource = body.data.resources[0];
        expect(workflowResource).to.have.property('resourceType');
        expect(workflowResource).to.have.property('sourceResourceId');
        expect(workflowResource).to.have.property('sourceResourceName');
        expect(workflowResource).to.have.property('targetResourceId');
        expect(workflowResource).to.have.property('targetResourceName');
        expect(workflowResource).to.have.property('changes');
        expect(workflowResource).to.have.property('summary');
        expect(workflowResource.summary).to.have.property('added');
        expect(workflowResource.summary).to.have.property('modified');
        expect(workflowResource.summary).to.have.property('deleted');
        expect(workflowResource.summary).to.have.property('unchanged');
      }
    });

    it('should handle multiple workflow changes in a single diff', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create multiple workflows with different scenarios
      const workflow1 = await createWorkflow({
        name: 'Workflow to Modify',
        workflowId: `multi-modify-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      const workflow2 = await createWorkflow({
        name: 'Workflow to Keep Same',
        workflowId: `multi-same-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      // Publish both workflows
      await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
          dryRun: false,
        })
        .expect(200);

      // Modify one workflow
      await novuClient.workflows.patch(
        {
          name: 'Modified Workflow Name',
        },
        workflow1.id
      );

      // Create a new workflow (will be added)
      await createWorkflow({
        name: 'New Workflow Added',
        workflowId: `multi-new-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      expect(body.data.summary.hasChanges).to.be.true;
      expect(body.data.summary.totalChanges).to.be.greaterThan(1);

      // Now each workflow has its own resource entry, so we need to check across all resources
      const allResources = body.data.resources;
      const addedWorkflows = allResources.filter((resource: any) =>
        resource.changes.some((diff: any) => diff.action === 'added')
      );
      const modifiedWorkflows = allResources.filter((resource: any) =>
        resource.changes.some((diff: any) => diff.action === 'modified')
      );

      expect(addedWorkflows.length).to.be.greaterThan(0);
      expect(modifiedWorkflows.length).to.be.greaterThan(0);
    });

    it('should include updatedBy information in diff results', async () => {
      const prodEnv = await getProductionEnvironment();
      const workflowId = `updatedby-diff-workflow-${Date.now()}`;

      // Create and publish a workflow
      const workflow = await createWorkflow({
        name: 'Workflow with UpdatedBy',
        workflowId,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test subject',
              body: 'Test body',
            },
          },
        ],
      });

      await session.testAgent
        .post('/v2/environments/publish')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
          dryRun: false,
        })
        .expect(200);

      // Update the workflow in source to change the updatedBy field
      await novuClient.workflows.patch(
        {
          name: 'Updated Workflow with UpdatedBy',
          description: 'Updated description to test updatedBy',
        },
        workflow.id
      );

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      expect(body.data.summary.hasChanges).to.be.true;

      // Find the modified workflow result
      const modifiedWorkflowResult = body.data.resources.find(
        (result: any) => result.sourceResourceName === 'Updated Workflow with UpdatedBy'
      );
      expect(modifiedWorkflowResult).to.exist;

      // Check that updatedBy information is included at the resource level
      expect(modifiedWorkflowResult).to.have.property('sourceResourceUpdatedBy');
      expect(modifiedWorkflowResult).to.have.property('targetResourceUpdatedBy');

      if (modifiedWorkflowResult.sourceResourceUpdatedBy) {
        expect(modifiedWorkflowResult.sourceResourceUpdatedBy).to.have.property('_id');
        expect(modifiedWorkflowResult.sourceResourceUpdatedBy).to.have.property('firstName');
        expect(modifiedWorkflowResult.sourceResourceUpdatedBy._id).to.equal(session.user._id);
      }

      if (modifiedWorkflowResult.targetResourceUpdatedBy) {
        expect(modifiedWorkflowResult.targetResourceUpdatedBy).to.have.property('_id');
        expect(modifiedWorkflowResult.targetResourceUpdatedBy).to.have.property('firstName');
        expect(modifiedWorkflowResult.targetResourceUpdatedBy._id).to.equal(session.user._id);
      }

      // Check that updatedBy information is also included in individual changes
      const modifiedWorkflow = modifiedWorkflowResult.changes.find((diff: any) => diff.action === 'modified');
      expect(modifiedWorkflow).to.exist;
      expect(modifiedWorkflow).to.have.property('sourceResourceUpdatedBy');
      expect(modifiedWorkflow).to.have.property('targetResourceUpdatedBy');

      if (modifiedWorkflow.sourceResourceUpdatedBy) {
        expect(modifiedWorkflow.sourceResourceUpdatedBy).to.have.property('_id');
        expect(modifiedWorkflow.sourceResourceUpdatedBy).to.have.property('firstName');
        expect(modifiedWorkflow.sourceResourceUpdatedBy._id).to.equal(session.user._id);
      }
    });
  });

  describe('Response Structure Tests', () => {
    it('should return proper response structure for diff operation', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      // Verify top-level structure
      expect(body.data).to.have.property('sourceEnvironmentId');
      expect(body.data).to.have.property('targetEnvironmentId');
      expect(body.data).to.have.property('resources');
      expect(body.data).to.have.property('summary');

      // Verify summary structure
      expect(body.data.summary).to.have.property('totalEntities');
      expect(body.data.summary).to.have.property('totalChanges');
      expect(body.data.summary).to.have.property('hasChanges');

      // Verify resources structure
      expect(body.data.resources).to.be.an('array');
      if (body.data.resources.length > 0) {
        const resource = body.data.resources[0];
        expect(resource).to.have.property('resourceType');
        expect(resource).to.have.property('changes');
        expect(resource).to.have.property('summary');
        expect(resource.summary).to.have.property('added');
        expect(resource.summary).to.have.property('modified');
        expect(resource.summary).to.have.property('deleted');
        expect(resource.summary).to.have.property('unchanged');
      }
    });

    it('should include workflow details in diff results', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create a workflow to ensure we have diff data
      await createWorkflow({
        name: 'Test Workflow for Structure',
        workflowId: `structure-test-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [],
      });

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      if (body.data.resources.length > 0 && body.data.resources[0].changes.length > 0) {
        const diff = body.data.resources[0].changes[0];
        expect(diff).to.have.property('sourceResourceId');
        expect(diff).to.have.property('sourceResourceName');
        expect(diff).to.have.property('targetResourceId');
        expect(diff).to.have.property('targetResourceName');
        expect(diff).to.have.property('action');
        expect(['added', 'modified', 'deleted', 'unchanged']).to.include(diff.action);

        if (diff.action === 'modified') {
          expect(diff).to.have.property('diffs');
        }
      }
    });
  });
});
