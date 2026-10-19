import { Novu } from '@novu/api';
import { WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Environment Diff API key environment scope - /v2/environments/:targetEnvironmentId/diff (POST) #novu-v2', () => {
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
    it('should forbid diffing against a different target environment via API key', async () => {
      const prodEnv = await getProductionEnvironment();

      await novuClient.workflows.create({
        name: 'Diff Scope Target Test',
        workflowId: `diff-scope-target-${Date.now()}`,
        description: 'Workflow for diff target scope testing',
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
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({
          sourceEnvironmentId: session.environment._id,
        });

      expect(body.statusCode).to.equal(403);
      expect(body.message).to.contain('is scoped to a single environment');
    });

    it('should forbid diffing with a different source environment via API key', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post(`/v2/environments/${session.environment._id}/diff`)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({
          sourceEnvironmentId: prodEnv._id,
        });

      expect(body.statusCode).to.equal(403);
      expect(body.message).to.contain('is scoped to a single environment');
    });

    it('should still allow bearer auth to diff across environments in the same org', async () => {
      const prodEnv = await getProductionEnvironment();
      const workflowId = `bearer-diff-${Date.now()}`;

      await novuClient.workflows.create({
        name: 'Bearer Diff Test',
        workflowId,
        description: 'Workflow for bearer diff test',
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
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(200);

      expect(body.data.sourceEnvironmentId).to.equal(session.environment._id);
      expect(body.data.targetEnvironmentId).to.equal(prodEnv._id);
      expect(body.data.resources).to.be.an('array');
    });
  });
});
