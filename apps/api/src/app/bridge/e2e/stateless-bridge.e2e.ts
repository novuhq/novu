import { NotificationTemplateRepository } from '@novu/dal';
import { workflow } from '@novu/framework';
import { ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import getPort from 'get-port';
import { TestBridgeServer } from '../../../../e2e/test-bridge-server';

describe('Stateless Bridge - /bridge/stateless/* (POST) #novu-v2', () => {
  let session: UserSession;
  let bridgeServer: TestBridgeServer;
  const workflowsRepository = new NotificationTemplateRepository();

  const testWorkflow = workflow(
    'local-mode-test',
    async ({ step, payload }) => {
      await step.email(
        'send-email',
        async (controls) => {
          return {
            subject: `Subject ${controls.prefix}`,
            body: `Body ${payload.name}`,
          };
        },
        {
          controlSchema: {
            type: 'object',
            properties: {
              prefix: { type: 'string', default: 'DEFAULT' },
            },
          } as const,
        }
      );
    },
    {
      payloadSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: 'John' },
        },
      } as const,
    }
  );

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    const port = await getPort();
    bridgeServer = new TestBridgeServer(port);
    await bridgeServer.start({ workflows: [testWorkflow] });
  });

  afterEach(async () => {
    await bridgeServer.stop();
  });

  describe('/stateless/status', () => {
    it('should return the bridge health check', async () => {
      const result = await session.testAgent.post('/v1/bridge/stateless/status').send({
        bridgeUrl: bridgeServer.serverPath,
      });

      expect(result.status).to.equal(201);
      expect(result.body.data.status).to.equal('ok');
      expect(result.body.data.discovered.workflows).to.equal(1);
    });

    it('should reject a blocked bridge url', async () => {
      const result = await session.testAgent.post('/v1/bridge/stateless/status').send({
        bridgeUrl: 'http://localhost:2022/api/novu',
      });

      expect(result.status).to.equal(400);
    });

    it('should reject a non-http bridge url', async () => {
      const result = await session.testAgent.post('/v1/bridge/stateless/status').send({
        bridgeUrl: 'ftp://example.com/api/novu',
      });

      // Rejected by the DTO @IsUrl validator (422) before the SSRF guard runs
      expect(result.status).to.equal(422);
    });
  });

  describe('/stateless/discover', () => {
    it('should return virtual workflows without persisting them', async () => {
      const result = await session.testAgent.post('/v1/bridge/stateless/discover').send({
        bridgeUrl: bridgeServer.serverPath,
      });

      expect(result.status).to.equal(201);

      const { workflows } = result.body.data;
      expect(workflows.length).to.equal(1);

      const [virtualWorkflow] = workflows;
      expect(virtualWorkflow.workflowId).to.equal('local-mode-test');
      expect(virtualWorkflow.origin).to.equal(ResourceOriginEnum.EXTERNAL);
      expect(virtualWorkflow.slug).to.be.a('string');
      expect(virtualWorkflow.payloadSchema).to.deep.include({ type: 'object' });
      expect(virtualWorkflow.payloadExample).to.be.an('object');

      expect(virtualWorkflow.steps.length).to.equal(1);
      const [step] = virtualWorkflow.steps;
      expect(step.stepId).to.equal('send-email');
      expect(step.type).to.equal(StepTypeEnum.EMAIL);
      expect(step.origin).to.equal(ResourceOriginEnum.EXTERNAL);
      expect(step.controls.dataSchema).to.be.an('object');
      expect(step.variables).to.be.an('object');

      // Nothing persisted
      const persisted = await workflowsRepository.find({ _environmentId: session.environment._id });
      expect(persisted.length).to.equal(0);
    });

    it('should return stable ids across repeated discover calls', async () => {
      const first = await session.testAgent.post('/v1/bridge/stateless/discover').send({
        bridgeUrl: bridgeServer.serverPath,
      });
      const second = await session.testAgent.post('/v1/bridge/stateless/discover').send({
        bridgeUrl: bridgeServer.serverPath,
      });

      expect(first.body.data.workflows[0]._id).to.equal(second.body.data.workflows[0]._id);
      expect(first.body.data.workflows[0].slug).to.equal(second.body.data.workflows[0].slug);
      expect(first.body.data.workflows[0].steps[0]._id).to.equal(second.body.data.workflows[0].steps[0]._id);
    });

    it('should reject a blocked bridge url', async () => {
      const result = await session.testAgent.post('/v1/bridge/stateless/discover').send({
        bridgeUrl: 'http://localhost:2022/api/novu',
      });

      expect(result.status).to.equal(400);
    });
  });

  describe('/stateless/preview/:workflowId/:stepId', () => {
    it('should render a step preview through the stateless bridge', async () => {
      const result = await session.testAgent.post('/v1/bridge/stateless/preview/local-mode-test/send-email').send({
        bridgeUrl: bridgeServer.serverPath,
        stepType: StepTypeEnum.EMAIL,
        controlValues: { prefix: 'FROM-TEST' },
        previewPayload: { payload: { name: 'Jane' } },
      });

      expect(result.status).to.equal(201);
      expect(result.body.data.result.type).to.equal(StepTypeEnum.EMAIL);
      expect(result.body.data.result.preview.subject).to.equal('Subject FROM-TEST');
      expect(result.body.data.result.preview.body).to.contain('Jane');
      expect(result.body.data.previewPayloadExample).to.deep.equal({ payload: { name: 'Jane' } });
    });

    it('should reject a blocked bridge url', async () => {
      const result = await session.testAgent.post('/v1/bridge/stateless/preview/local-mode-test/send-email').send({
        bridgeUrl: 'http://localhost:2022/api/novu',
        stepType: StepTypeEnum.EMAIL,
      });

      expect(result.status).to.equal(400);
    });
  });
});
