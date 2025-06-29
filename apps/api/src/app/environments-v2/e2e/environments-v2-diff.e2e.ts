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

  describe('Validation Tests', () => {
    it('should return validation error for same source and target environment', async () => {
      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.contain('Source and target environments cannot be the same');
    });

    it('should return validation error for invalid environment IDs', async () => {
      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: 'invalid-id',
          targetEnvironmentId: 'another-invalid-id',
        })
        .expect(400);

      expect(body.message).to.contain('Invalid environment ID format');
    });

    it('should return validation error for non-existent source environment', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: '60a5f2f2f2f2f2f2f2f2f2f2',
          targetEnvironmentId: prodEnv._id,
        })
        .expect(400);

      expect(body.message).to.contain('Source environment not found');
    });

    it('should return validation error for non-existent target environment', async () => {
      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: '60a5f2f2f2f2f2f2f2f2f2f2',
        })
        .expect(400);

      expect(body.message).to.contain('Target environment not found');
    });
  });

  describe('Diff Detection Tests', () => {
    it('should detect no changes when environments are identical', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post('/v2/environments/diff')
        .send({
          sourceEnvironmentId: session.environment._id,
          targetEnvironmentId: prodEnv._id,
        })
        .expect(200);

      expect(body.data).to.have.property('results');
      expect(body.data).to.have.property('summary');
      expect(body.data.summary).to.have.property('totalEntities');
      expect(body.data.summary).to.have.property('totalChanges');
      expect(body.data.summary).to.have.property('hasChanges');
      expect(body.data.sourceEnvironmentId).to.equal(session.environment._id);
      expect(body.data.targetEnvironmentId).to.equal(prodEnv._id);
    });

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
      expect(body.data.results).to.have.length(1);
      expect(body.data.results[0].entityType).to.equal('workflow');
      expect(body.data.results[0].entityName).to.equal('New Workflow for Diff');
      expect(body.data.results[0].summary.added).to.be.greaterThan(0);

      // Find the added workflow in the diff
      const addedWorkflow = body.data.results[0].diffs.find(
        (diff: any) => diff.action === 'added' && diff.entityName === 'New Workflow for Diff'
      );
      expect(addedWorkflow).to.exist;
      expect(addedWorkflow.entityId).to.exist;
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
      const modifiedWorkflowResult = body.data.results.find(
        (result: any) => result.entityName === 'Modified Workflow Name'
      );
      expect(modifiedWorkflowResult).to.exist;

      const modifiedWorkflow = modifiedWorkflowResult.diffs.find((diff: any) => diff.action === 'modified');
      expect(modifiedWorkflow).to.exist;
      expect(modifiedWorkflow.changes).to.exist;
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
      const deletedWorkflowResult = body.data.results.find((result: any) => result.entityName === 'Workflow to Delete');
      expect(deletedWorkflowResult).to.exist;

      const deletedWorkflow = deletedWorkflowResult.diffs.find((diff: any) => diff.action === 'deleted');
      expect(deletedWorkflow).to.exist;
    });

    it('should handle diff with includeInactive option', async () => {
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
          includeInactive: true,
        })
        .expect(200);

      expect(body.data).to.have.property('results');
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

      // Each workflow gets its own result entry now
      expect(body.data.results).to.be.an('array');
      if (body.data.results.length > 0) {
        const workflowResult = body.data.results[0];
        expect(workflowResult).to.have.property('entityType');
        expect(workflowResult).to.have.property('entityId');
        expect(workflowResult).to.have.property('entityName');
        expect(workflowResult).to.have.property('diffs');
        expect(workflowResult).to.have.property('summary');
        expect(workflowResult.summary).to.have.property('added');
        expect(workflowResult.summary).to.have.property('modified');
        expect(workflowResult.summary).to.have.property('deleted');
        expect(workflowResult.summary).to.have.property('unchanged');
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

      // Now each workflow has its own result entry, so we need to check across all results
      const allResults = body.data.results;
      const addedWorkflows = allResults.filter((result: any) =>
        result.diffs.some((diff: any) => diff.action === 'added')
      );
      const modifiedWorkflows = allResults.filter((result: any) =>
        result.diffs.some((diff: any) => diff.action === 'modified')
      );

      expect(addedWorkflows.length).to.be.greaterThan(0);
      expect(modifiedWorkflows.length).to.be.greaterThan(0);
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
      expect(body.data).to.have.property('results');
      expect(body.data).to.have.property('summary');

      // Verify summary structure
      expect(body.data.summary).to.have.property('totalEntities');
      expect(body.data.summary).to.have.property('totalChanges');
      expect(body.data.summary).to.have.property('hasChanges');

      // Verify results structure
      expect(body.data.results).to.be.an('array');
      if (body.data.results.length > 0) {
        const result = body.data.results[0];
        expect(result).to.have.property('entityType');
        expect(result).to.have.property('diffs');
        expect(result).to.have.property('summary');
        expect(result.summary).to.have.property('added');
        expect(result.summary).to.have.property('modified');
        expect(result.summary).to.have.property('deleted');
        expect(result.summary).to.have.property('unchanged');
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

      if (body.data.results.length > 0 && body.data.results[0].diffs.length > 0) {
        const diff = body.data.results[0].diffs[0];
        expect(diff).to.have.property('entityId');
        expect(diff).to.have.property('entityName');
        expect(diff).to.have.property('action');
        expect(['added', 'modified', 'deleted', 'unchanged']).to.include(diff.action);

        if (diff.action === 'modified') {
          expect(diff).to.have.property('changes');
        }
      }
    });
  });
});
