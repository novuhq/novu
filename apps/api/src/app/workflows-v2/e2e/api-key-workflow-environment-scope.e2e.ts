import { Novu } from '@novu/api';
import { WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Workflow API key environment scope - /v2/workflows (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();

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

  describe('API key authentication is scoped to the key environment', () => {
    it('should forbid reading a workflow from a different environment via API key', async () => {
      const prodEnv = await getProductionEnvironment();
      const workflowId = `cross-env-read-${Date.now()}`;

      await novuClient.workflows.create({
        name: 'Cross Env Read Test',
        workflowId,
        description: 'Workflow created in development for scope testing',
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: 'email',
            controlValues: {
              subject: 'Test Subject',
              body: 'Test email content',
            },
          },
        ],
        source: WorkflowCreationSourceEnum.Editor,
      });

      await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/publish`)
        .send({
          sourceEnvironmentId: session.environment._id,
          dryRun: false,
        })
        .expect(200);

      const { body } = await session.testAgent
        .get(`/v2/workflows/${workflowId}`)
        .query({ environmentId: prodEnv._id })
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(body.statusCode).to.equal(403);
      expect(body.message).to.contain('is scoped to a single environment');
    });

    it('should allow reading a workflow from the API key environment via API key', async () => {
      const workflowId = `same-env-read-${Date.now()}`;

      await novuClient.workflows.create({
        name: 'Same Env Read Test',
        workflowId,
        description: 'Workflow readable with scoped API key',
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: 'email',
            controlValues: {
              subject: 'Test Subject',
              body: 'Test email content',
            },
          },
        ],
        source: WorkflowCreationSourceEnum.Editor,
      });

      const { body } = await session.testAgent
        .get(`/v2/workflows/${workflowId}`)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(body.data.workflowId).to.equal(workflowId);
    });

    it('should still allow bearer auth to read a workflow from another environment in the same org', async () => {
      const prodEnv = await getProductionEnvironment();
      const workflowId = `bearer-cross-env-read-${Date.now()}`;

      await novuClient.workflows.create({
        name: 'Bearer Cross Env Read Test',
        workflowId,
        description: 'Workflow published to production for bearer auth test',
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: 'email',
            controlValues: {
              subject: 'Test Subject',
              body: 'Test email content',
            },
          },
        ],
        source: WorkflowCreationSourceEnum.Editor,
      });

      await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/publish`)
        .send({
          sourceEnvironmentId: session.environment._id,
          dryRun: false,
        })
        .expect(200);

      const { body } = await session.testAgent.get(`/v2/workflows/${workflowId}`).query({ environmentId: prodEnv._id });

      expect(body.data.workflowId).to.equal(workflowId);
    });
  });
});
