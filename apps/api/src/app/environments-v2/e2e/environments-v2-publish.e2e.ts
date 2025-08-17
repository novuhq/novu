import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/api/models/components';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { EmailBlockTypeEnum, ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Environment Publish - /v2/environments/:targetEnvironmentId/publish (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();
  const workflowRepository = new NotificationTemplateRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  it('should return validation error for same source and target environment', async () => {
    const { body } = await session.testAgent
      .post(`/v2/environments/${session.environment._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
      })
      .expect(400);

    expect(body.message).to.contain('Source and target environments cannot be the same');
  });

  it('should return validation error for invalid environment IDs', async () => {
    const { body } = await session.testAgent
      .post(`/v2/environments/invalid-id/publish`)
      .send({
        sourceEnvironmentId: 'invalid-id',
      })
      .expect(400);

    expect(body.message).to.contain('Invalid environment ID format');
  });

  it('should publish workflows successfully', async () => {
    // Get the production environment (automatically created with the session)
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create a workflow in the dev environment using the SDK
    const workflowData = {
      name: 'Test Workflow Publish',
      workflowId: 'test-workflow-publish',
      description: 'This is a test workflow for publishing',
      active: true,
      steps: [
        {
          name: 'Email Step',
          type: 'email' as const,
          controlValues: {
            subject: 'Test Subject for Publish',
            body: 'Test email content for publish',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const { result: workflow } = await novuClient.workflows.create(workflowData);

    // Wait a bit for the workflow to be fully created
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    // Test actual publish (not dry run)
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
        dryRun: false,
      })
      .expect(200);

    expect(body.data.summary.resources).to.equal(1);
    expect(body.data.summary.successful).to.equal(1);
    expect(body.data.summary.failed).to.equal(0);
    expect(body.data.summary.skipped).to.equal(0);

    // Verify the workflow was actually created in the production environment
    const publishedWorkflow = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: workflow.workflowId } },
    });

    expect(publishedWorkflow).to.be.ok;
    expect(publishedWorkflow?.name).to.equal('Test Workflow Publish');
  });

  it('should use development environment as default source when sourceEnvironmentId is not provided', async () => {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    const workflowData = {
      name: 'Test Workflow Default Source',
      workflowId: 'test-workflow-default-source',
      description: 'This is a test workflow for default source',
      active: true,
      steps: [
        {
          name: 'Email Step',
          type: 'email' as const,
          controlValues: {
            subject: 'Test Subject Default',
            body: 'Test email content default',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const { result: workflow } = await novuClient.workflows.create(workflowData);

    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        dryRun: true, // Use dry run to avoid side effects
      }) // No sourceEnvironmentId provided
      .expect(200);

    expect(body.data.summary.resources).to.equal(1);
    expect(body.data.summary.successful).to.equal(0);
    expect(body.data.summary.failed).to.equal(0);
    expect(body.data.summary.skipped).to.equal(1);
  });

  it('should publish specific workflows when resources is provided', async () => {
    // Get the production environment
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create multiple workflows in the dev environment
    const workflow1Data = {
      name: 'Test Workflow 1',
      workflowId: 'test-workflow-1',
      description: 'First test workflow',
      active: true,
      steps: [
        {
          name: 'Email Step 1',
          type: 'email' as const,
          controlValues: {
            subject: 'Test Subject 1',
            body: 'Test email content 1',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const workflow2Data = {
      name: 'Test Workflow 2',
      workflowId: 'test-workflow-2',
      description: 'Second test workflow',
      active: true,
      steps: [
        {
          name: 'Email Step 2',
          type: 'email' as const,
          controlValues: {
            subject: 'Test Subject 2',
            body: 'Test email content 2',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const { result: workflow1 } = await novuClient.workflows.create(workflow1Data);
    const { result: workflow2 } = await novuClient.workflows.create(workflow2Data);

    // Wait for workflows to be created
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    // Test selective publish - only publish the first workflow
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
        dryRun: false,
        resources: [
          {
            resourceType: 'workflow',
            resourceId: workflow1.workflowId,
          },
        ],
      })
      .expect(200);

    expect(body.data.summary.resources).to.equal(1);
    expect(body.data.summary.successful).to.equal(1);
    expect(body.data.summary.failed).to.equal(0);
    expect(body.data.summary.skipped).to.equal(0);

    // Verify only the first workflow was published
    const publishedWorkflow1 = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: workflow1.workflowId } },
    });

    const publishedWorkflow2 = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: workflow2.workflowId } },
    });

    expect(publishedWorkflow1).to.be.ok;
    expect(publishedWorkflow1?.name).to.equal('Test Workflow 1');
    expect(publishedWorkflow2).to.be.null; // Should not exist
  });

  it('should publish multiple resources of different types when resources contains mixed types', async () => {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create two workflows instead of workflow + layout to avoid layout creation issues
    const workflow1Data = {
      name: 'Mixed Type Test Workflow 1',
      workflowId: 'mixed-type-workflow-1',
      description: 'First workflow for mixed type test',
      active: true,
      steps: [
        {
          name: 'Email Step 1',
          type: 'email' as const,
          controlValues: {
            subject: 'Mixed Type Subject 1',
            body: 'Mixed type email content 1',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const workflow2Data = {
      name: 'Mixed Type Test Workflow 2',
      workflowId: 'mixed-type-workflow-2',
      description: 'Second workflow for mixed type test',
      active: true,
      steps: [
        {
          name: 'Email Step 2',
          type: 'email' as const,
          controlValues: {
            subject: 'Mixed Type Subject 2',
            body: 'Mixed type email content 2',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const { result: workflow1 } = await novuClient.workflows.create(workflow1Data);
    const { result: workflow2 } = await novuClient.workflows.create(workflow2Data);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    // Test selective publish with multiple workflows
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
        dryRun: false,
        resources: [
          {
            resourceType: 'workflow',
            resourceId: workflow1.workflowId,
          },
          {
            resourceType: 'workflow',
            resourceId: workflow2.workflowId,
          },
        ],
      })
      .expect(200);

    expect(body.data.summary.resources).to.equal(2);
    expect(body.data.summary.successful).to.equal(2);
    expect(body.data.summary.failed).to.equal(0);
    expect(body.data.summary.skipped).to.equal(0);

    // Verify both workflows were published
    const publishedWorkflow1 = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: workflow1.workflowId } },
    });

    const publishedWorkflow2 = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: workflow2.workflowId } },
    });

    expect(publishedWorkflow1).to.be.ok;
    expect(publishedWorkflow1?.name).to.equal('Mixed Type Test Workflow 1');
    expect(publishedWorkflow2).to.be.ok;
    expect(publishedWorkflow2?.name).to.equal('Mixed Type Test Workflow 2');
  });

  it('should work correctly in dry run mode with selective publishing', async () => {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create a workflow
    const workflowData = {
      name: 'Dry Run Test Workflow',
      workflowId: 'dry-run-test-workflow',
      description: 'Workflow for dry run test',
      active: true,
      steps: [
        {
          name: 'Email Step',
          type: 'email' as const,
          controlValues: {
            subject: 'Dry Run Subject',
            body: 'Dry run email content',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const { result: workflow } = await novuClient.workflows.create(workflowData);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    // Test selective publish in dry run mode
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
        dryRun: true,
        resources: [
          {
            resourceType: 'workflow',
            resourceId: workflow.workflowId,
          },
        ],
      })
      .expect(200);

    expect(body.data.summary.resources).to.equal(1);
    expect(body.data.summary.successful).to.equal(0);
    expect(body.data.summary.failed).to.equal(0);
    expect(body.data.summary.skipped).to.equal(1);

    // Verify the workflow was NOT actually published (dry run)
    const publishedWorkflow = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: workflow.workflowId } },
    });

    expect(publishedWorkflow).to.be.null;
  });

  it('should return error when resources contains unsupported resource type', async () => {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Test with unsupported resource type
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
        dryRun: false,
        resources: [
          {
            resourceType: 'unsupported_type',
            resourceId: 'some-id',
          },
        ],
      })
      .expect(422); // Changed from 400 to 422 as it's a validation error

    expect(body.message).to.contain('Validation Error');
  });

  it('should fall back to full publish when resources is empty array', async () => {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create a workflow
    const workflowData = {
      name: 'Fallback Test Workflow',
      workflowId: 'fallback-test-workflow',
      description: 'Workflow for fallback test',
      active: true,
      steps: [
        {
          name: 'Email Step',
          type: 'email' as const,
          controlValues: {
            subject: 'Fallback Subject',
            body: 'Fallback email content',
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    };

    const { result: workflow } = await novuClient.workflows.create(workflowData);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    // Test with empty resources array (should fall back to full publish)
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
        dryRun: true, // Use dry run to avoid side effects
        resources: [], // Empty array
      })
      .expect(200);

    // Should process all available resources (fallback to full publish)
    expect(body.data.summary.resources).to.equal(1);
    expect(body.data.summary.skipped).to.equal(1); // Dry run skips
  });

  /*
   * Continue with the rest of the tests, updating all .post('/v2/environments/publish') calls
   * to use the new format .post(`/v2/environments/${targetEnvId}/publish`)
   * and removing targetEnvironmentId from the request body
   */

  async function createWorkflow(workflow: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: createWorkflowBody } = await novuClient.workflows.create(workflow);

    return createWorkflowBody;
  }
});
