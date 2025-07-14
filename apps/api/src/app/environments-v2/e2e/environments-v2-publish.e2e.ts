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

  it('should perform dry run successfully', async () => {
    // Get the production environment (automatically created with the session)
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create a workflow in the dev environment
    const workflow = await createWorkflow({
      name: 'Test Workflow',
      workflowId: 'test-workflow',
      steps: [
        {
          name: 'Email Step',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Test Subject',
            body: [
              {
                type: EmailBlockTypeEnum.TEXT,
                content: 'Test email content',
              },
            ],
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    });

    // Test dry run
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        sourceEnvironmentId: session.environment._id,
        dryRun: true,
      })
      .expect(200);

    expect(body.data.summary.resources).to.equal(1);
    expect(body.data.summary.successful).to.equal(1);
    expect(body.data.summary.failed).to.equal(0);
    expect(body.data.summary.skipped).to.equal(0);
  });

  it('should publish workflows successfully', async () => {
    // Get the production environment
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create a workflow in the dev environment
    const workflow = await createWorkflow({
      name: 'Test Workflow',
      workflowId: 'test-workflow',
      steps: [
        {
          name: 'Email Step',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Test Subject',
            body: [
              {
                type: EmailBlockTypeEnum.TEXT,
                content: 'Test email content',
              },
            ],
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    });

    // Publish to production
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

    // Verify the workflow was created in production
    const prodWorkflow = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: {
        $elemMatch: {
          identifier: 'test-workflow',
        },
      },
    });

    expect(prodWorkflow).to.exist;
    expect(prodWorkflow?.name).to.equal('Test Workflow');
  });

  it('should use development environment as default source when sourceEnvironmentId is not provided', async () => {
    // Get the production environment
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    // Create a workflow in the dev environment
    const workflow = await createWorkflow({
      name: 'Test Workflow Default',
      workflowId: 'test-workflow-default',
      steps: [
        {
          name: 'Email Step',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Test Subject',
            body: [
              {
                type: EmailBlockTypeEnum.TEXT,
                content: 'Test email content',
              },
            ],
          },
        },
      ],
      source: WorkflowCreationSourceEnum.Editor,
    });

    // Publish to production without specifying sourceEnvironmentId
    const { body } = await session.testAgent
      .post(`/v2/environments/${prodEnv._id}/publish`)
      .send({
        dryRun: false,
      })
      .expect(200);

    expect(body.data.summary.resources).to.equal(1);
    expect(body.data.summary.successful).to.equal(1);
    expect(body.data.summary.failed).to.equal(0);
    expect(body.data.summary.skipped).to.equal(0);

    // Verify the workflow was created in production
    const prodWorkflow = await workflowRepository.findOne({
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
      triggers: {
        $elemMatch: {
          identifier: 'test-workflow-default',
        },
      },
    });

    expect(prodWorkflow).to.exist;
    expect(prodWorkflow?.name).to.equal('Test Workflow Default');
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
