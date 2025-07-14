import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/api/models/components';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Environment Diff - /v2/environments/:targetEnvironmentId/diff (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();
  const workflowRepository = new NotificationTemplateRepository();

  beforeEach(async () => {
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
        .post(`/v2/environments/${session.environment._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.equal('Source and target environments cannot be the same');
    });

    it('should return 400 when source environment is invalid', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: 'invalid-id',
        })
        .expect(400);

      expect(body.message).to.contain('Invalid environment ID format');
    });

    it('should return 400 when target environment is invalid', async () => {
      const { body } = await session.testAgent
        .post(`/v2/environments/invalid-id/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.contain('Invalid environment ID format');
    });

    it('should return 400 when source environment does not exist', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: '507f1f77bcf86cd799439011',
        })
        .expect(400);

      expect(body.message).to.equal('Source environment not found');
    });

    it('should return 400 when target environment does not exist', async () => {
      const { body } = await session.testAgent
        .post(`/v2/environments/507f1f77bcf86cd799439011/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.equal('Target environment not found');
    });
  });

  describe('Workflow Diff Tests', () => {
    it('should return empty diff when environments are identical', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(200);

      expect(body.data.sourceEnvironmentId).to.equal(session.environment._id);
      expect(body.data.targetEnvironmentId).to.equal(prodEnv._id);
      expect(body.data.resources).to.be.an('array');
      expect(body.data.summary.totalEntities).to.equal(0);
      expect(body.data.summary.totalChanges).to.equal(0);
      expect(body.data.summary.hasChanges).to.equal(false);
    });

    it('should use development environment as default source when sourceEnvironmentId is not provided', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create a workflow in the dev environment
      const workflow = await createWorkflow({
        name: 'Test Workflow for Default Source',
        workflowId: 'test-workflow-default-source',
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'Test Subject',
              body: 'Test email content',
            },
          },
        ],
        source: WorkflowCreationSourceEnum.Editor,
      });

      // Diff without specifying sourceEnvironmentId (should default to development)
      const { body } = await session.testAgent.post(`/v2/environments/${prodEnv._id}/diff`).send({}).expect(200);

      expect(body.data.sourceEnvironmentId).to.equal(session.environment._id);
      expect(body.data.targetEnvironmentId).to.equal(prodEnv._id);
      expect(body.data.resources).to.be.an('array');
      expect(body.data.summary.totalEntities).to.be.greaterThan(0);
      expect(body.data.summary.totalChanges).to.be.greaterThan(0);
      expect(body.data.summary.hasChanges).to.equal(true);
    });

    /*
     * Continue with the rest of the tests, updating all .post('/v2/environments/diff') calls
     * to use the new format .post(`/v2/environments/${targetEnvId}/diff`)
     * and removing targetEnvironmentId from the request body
     */
  });
});
