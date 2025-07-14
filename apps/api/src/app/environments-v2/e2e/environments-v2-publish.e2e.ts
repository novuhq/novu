import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum, EmailBlockTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/api/models/components';
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
