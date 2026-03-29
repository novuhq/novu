import { Novu } from '@novu/api';
import { WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/api/models/components';
import { ControlValuesRepository, EnvironmentRepository, MessageTemplateRepository } from '@novu/dal';
import { ControlValuesLevelEnum, FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { FeatureFlagsService } from '@novu/application-generic';
import { CloudflareStepResolverDeployService } from '../services/cloudflare-step-resolver-deploy.service';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Step Resolvers #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let sandbox: sinon.SinonSandbox;
  const messageTemplateRepository = new MessageTemplateRepository();
  const controlValuesRepository = new ControlValuesRepository();
  const environmentRepository = new EnvironmentRepository();

  let workflow: WorkflowResponseDto;
  let emailStepId: string;
  let emailStepInternalId: string;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    sandbox.stub(CloudflareStepResolverDeployService.prototype, 'deploy').resolves();
    sandbox.stub(FeatureFlagsService.prototype, 'getFlag').resolves(true);

    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);

    const { result } = await novuClient.workflows.create({
      name: 'Test Email Workflow',
      workflowId: `test-email-${Date.now()}`,
      source: WorkflowCreationSourceEnum.Editor,
      active: true,
      steps: [
        {
          name: 'email-step',
          stepId: 'email-step',
          type: StepTypeEnum.EMAIL,
          controlValues: {},
        },
      ],
    });

    workflow = result;
    emailStepId = workflow.steps[0].stepId;

    const stepTemplate = await messageTemplateRepository.findOne({
      _environmentId: session.environment._id,
      type: StepTypeEnum.EMAIL,
    });
    emailStepInternalId = String(stepTemplate?._id);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  async function createWorkflowWithStep(stepType: StepTypeEnum): Promise<{ workflow: WorkflowResponseDto; stepInternalId: string }> {
    const stepId = `${stepType}-step`;
    const { result: wf } = await novuClient.workflows.create({
      name: `Test ${stepType} Workflow`,
      workflowId: `test-${stepType}-${Date.now()}`,
      source: WorkflowCreationSourceEnum.Editor,
      active: true,
      steps: [
        {
          name: stepId,
          stepId,
          type: stepType,
          controlValues: {},
        },
      ],
    });

    const stepTemplate = await messageTemplateRepository.findOne({
      _environmentId: session.environment._id,
      type: stepType,
    });

    return { workflow: wf, stepInternalId: String(stepTemplate?._id) };
  }

  function buildDeployRequest(workflowId: string, stepId: string, stepType: StepTypeEnum, controlSchema?: Record<string, unknown>) {
    const manifestStep: Record<string, unknown> = { workflowId, stepId, stepType };
    if (controlSchema) {
      manifestStep.controlSchema = controlSchema;
    }

    return {
      manifest: JSON.stringify({ steps: [manifestStep] }),
      bundle: Buffer.from('export default {}'),
    };
  }

  describe('POST /v2/step-resolvers/deploy', () => {
    it('should deploy step resolver for an email step and write hash + ControlValues', async () => {
      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL);

      const response = await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      expect(response.status).to.equal(201);
      expect(response.body.stepResolverHash).to.be.a('string').that.matches(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
      expect(response.body.workerId).to.match(/^sr-/);
      expect(response.body.deployedStepsCount).to.equal(1);
      expect(response.body.deployedAt).to.be.a('string');

      const template = await messageTemplateRepository.findOne({
        _id: emailStepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.equal(response.body.stepResolverHash);

      const controlValues = await controlValuesRepository.findFirst({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(controlValues).to.exist;
    });

    it('should write controlSchema to controls.schema when provided', async () => {
      const controlSchema = {
        type: 'object',
        properties: { headline: { type: 'string' } },
        additionalProperties: false,
        required: [],
      };

      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL, controlSchema);

      const response = await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      expect(response.status).to.equal(201);

      const template = await messageTemplateRepository.findOne({
        _id: emailStepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.controls?.schema).to.deep.equal(controlSchema);
    });

    it('should preserve existing ControlValues fields that are still in the schema on redeploy', async () => {
      const wfId = workflow._id;
      await controlValuesRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        _workflowId: wfId,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        priority: 0,
        controls: { headline: 'Hello' },
      });

      const controlSchema = {
        type: 'object',
        properties: { headline: { type: 'string' } },
        additionalProperties: false,
        required: [],
      };

      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL, controlSchema);

      await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const docs = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(docs).to.have.length(1);
      expect((docs[0].controls as Record<string, unknown>).headline).to.equal('Hello');
    });

    it('should prune stale ControlValues fields removed from schema on redeploy', async () => {
      const wfId = workflow._id;
      await controlValuesRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        _workflowId: wfId,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        priority: 0,
        controls: { headline: 'Hello', oldField: 'gone' },
      });

      const controlSchema = {
        type: 'object',
        properties: { headline: { type: 'string' } },
        additionalProperties: false,
        required: [],
      };

      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL, controlSchema);

      await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const docs = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(docs).to.have.length(1);
      expect(docs[0].controls).to.deep.equal({ headline: 'Hello' });
    });

    it('should wipe existing ControlValues when redeploying without a controlSchema', async () => {
      const wfId = workflow._id;
      await controlValuesRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        _workflowId: wfId,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        priority: 0,
        controls: { headline: 'Hello' },
      });

      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL);

      await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const docs = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(docs).to.have.length(1);
      expect(docs[0].controls).to.deep.equal({});
    });

    it('should return 400 when manifest stepType does not match actual step type', async () => {
      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.SMS);

      const response = await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include('does not match');

      const template = await messageTemplateRepository.findOne({
        _id: emailStepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.be.undefined;
    });

    it('should return 400 when bundle is missing', async () => {
      const manifest = JSON.stringify({
        steps: [{ workflowId: workflow.workflowId, stepId: emailStepId, stepType: StepTypeEnum.EMAIL }],
      });

      const response = await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include('Bundle file is required');
    });

    describe('Action step types', () => {
      const actionStepTypes = [StepTypeEnum.DELAY, StepTypeEnum.DIGEST, StepTypeEnum.THROTTLE];

      for (const stepType of actionStepTypes) {
        it(`should deploy step resolver for a ${stepType} step`, async () => {
          const { workflow: actionWorkflow, stepInternalId } = await createWorkflowWithStep(stepType);
          const stepId = `${stepType}-step`;

          const { manifest, bundle } = buildDeployRequest(actionWorkflow.workflowId, stepId, stepType);

          const response = await session.testAgent
            .post('/v2/step-resolvers/deploy')
            .field('manifest', manifest)
            .attach('bundle', bundle, 'bundle.js');

          expect(response.status).to.equal(201);
          expect(response.body.stepResolverHash).to.be.a('string').that.matches(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
          expect(response.body.deployedStepsCount).to.equal(1);

          const template = await messageTemplateRepository.findOne({
            _id: stepInternalId,
            _environmentId: session.environment._id,
          });
          expect(template?.stepResolverHash).to.equal(response.body.stepResolverHash);
        });
      }

      it('should return 400 when deploying step resolver for a trigger step', async () => {
        const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.TRIGGER);

        const response = await session.testAgent
          .post('/v2/step-resolvers/deploy')
          .field('manifest', manifest)
          .attach('bundle', bundle, 'bundle.js');

        expect(response.status).to.equal(400);
        expect(response.body.message).to.include('not supported');
      });
    });
  });

  describe('DELETE /v2/step-resolvers/:stepId/disconnect', () => {
    it('should disconnect step resolver from an email step and reset schema', async () => {
      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL);
      await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const response = await session.testAgent
        .delete(`/v2/step-resolvers/${emailStepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.EMAIL });

      expect(response.status).to.equal(200);

      const template = await messageTemplateRepository.findOne({
        _id: emailStepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.be.undefined;

      const controlValues = await controlValuesRepository.findFirst({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _stepId: emailStepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(controlValues).to.be.null;
    });

    it('should disconnect step resolver from a delay step and reset schema to default delay schema', async () => {
      const { workflow: delayWorkflow, stepInternalId } = await createWorkflowWithStep(StepTypeEnum.DELAY);
      const delayStepId = `${StepTypeEnum.DELAY}-step`;

      const { manifest, bundle } = buildDeployRequest(delayWorkflow.workflowId, delayStepId, StepTypeEnum.DELAY);
      await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const response = await session.testAgent
        .delete(`/v2/step-resolvers/${stepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.DELAY });

      expect(response.status).to.equal(200);

      const template = await messageTemplateRepository.findOne({
        _id: stepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.be.undefined;
    });

    it('should return 400 when disconnecting with trigger step type', async () => {
      const response = await session.testAgent
        .delete(`/v2/step-resolvers/${emailStepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.TRIGGER });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include('does not support step resolvers');
    });
  });

  describe('GET /v2/step-resolvers/count', () => {
    it('should return correct count across deploy and disconnect lifecycle', async () => {
      const isolatedSession = new UserSession();
      await isolatedSession.initialize();
      const isolatedClient = initNovuClassSdkInternalAuth(isolatedSession);

      const countBefore = await isolatedSession.testAgent.get('/v2/step-resolvers/count');
      expect(countBefore.body.count).to.equal(0);

      const { result: wfA } = await isolatedClient.workflows.create({
        name: 'Workflow A',
        workflowId: `wf-a-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [{ name: 'email-step', stepId: 'email-step', type: StepTypeEnum.EMAIL, controlValues: {} }],
      });
      const stepTemplateA = await messageTemplateRepository.findOne({
        _environmentId: isolatedSession.environment._id,
        type: StepTypeEnum.EMAIL,
      });
      const stepAInternalId = String(stepTemplateA?._id);

      const { manifest: manifestA, bundle: bundleA } = buildDeployRequest(wfA.workflowId, 'email-step', StepTypeEnum.EMAIL);
      await isolatedSession.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifestA)
        .attach('bundle', bundleA, 'bundle.js');

      const countAfterA = await isolatedSession.testAgent.get('/v2/step-resolvers/count');
      expect(countAfterA.body.count).to.equal(1);

      const { result: wfB } = await isolatedClient.workflows.create({
        name: 'Workflow B',
        workflowId: `wf-b-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [{ name: 'email-step', stepId: 'email-step', type: StepTypeEnum.EMAIL, controlValues: {} }],
      });
      const stepTemplateB = await messageTemplateRepository.find({
        _environmentId: isolatedSession.environment._id,
        type: StepTypeEnum.EMAIL,
      });
      const stepBInternalId = String(stepTemplateB[stepTemplateB.length - 1]?._id);

      const { manifest: manifestB, bundle: bundleB } = buildDeployRequest(wfB.workflowId, 'email-step', StepTypeEnum.EMAIL);
      await isolatedSession.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifestB)
        .attach('bundle', bundleB, 'bundle.js');

      const countAfterB = await isolatedSession.testAgent.get('/v2/step-resolvers/count');
      expect(countAfterB.body.count).to.equal(2);

      await isolatedSession.testAgent
        .delete(`/v2/step-resolvers/${stepAInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.EMAIL });

      const countAfterDisconnect = await isolatedSession.testAgent.get('/v2/step-resolvers/count');
      expect(countAfterDisconnect.body.count).to.equal(1);
    });
  });

  describe('Publish (sync to environment)', () => {
    it('should promote stepResolverHash to production on publish', async () => {
      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL);
      const deployResponse = await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const prodEnv = await environmentRepository.findOne({
        _parentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      const publishResponse = await session.testAgent
        .post(`/v2/environments/${prodEnv?._id}/publish`)
        .send({ sourceEnvironmentId: session.environment._id, dryRun: false });

      expect(publishResponse.status).to.equal(200);
      expect(publishResponse.body.summary?.successful).to.equal(1);

      const prodTemplate = await messageTemplateRepository.findOne({
        _environmentId: prodEnv?._id,
        type: StepTypeEnum.EMAIL,
      });
      expect(prodTemplate?.stepResolverHash).to.equal(deployResponse.body.stepResolverHash);
    });

    it('should clear stepResolverHash from production when dev step resolver is disconnected then published', async () => {
      const { manifest, bundle } = buildDeployRequest(workflow.workflowId, emailStepId, StepTypeEnum.EMAIL);
      await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const prodEnv = await environmentRepository.findOne({
        _parentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      await session.testAgent
        .post(`/v2/environments/${prodEnv?._id}/publish`)
        .send({ sourceEnvironmentId: session.environment._id, dryRun: false });

      await session.testAgent
        .delete(`/v2/step-resolvers/${emailStepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.EMAIL });

      const republishResponse = await session.testAgent
        .post(`/v2/environments/${prodEnv?._id}/publish`)
        .send({ sourceEnvironmentId: session.environment._id, dryRun: false });

      expect(republishResponse.status).to.equal(200);

      const prodTemplate = await messageTemplateRepository.findOne({
        _environmentId: prodEnv?._id,
        type: StepTypeEnum.EMAIL,
      });
      expect(prodTemplate?.stepResolverHash).to.be.undefined;
    });

    it('should promote stepResolverHash to production for a delay step on publish', async () => {
      const { workflow: delayWorkflow, stepInternalId } = await createWorkflowWithStep(StepTypeEnum.DELAY);
      const delayStepId = `${StepTypeEnum.DELAY}-step`;

      const { manifest, bundle } = buildDeployRequest(delayWorkflow.workflowId, delayStepId, StepTypeEnum.DELAY);
      const deployResponse = await session.testAgent
        .post('/v2/step-resolvers/deploy')
        .field('manifest', manifest)
        .attach('bundle', bundle, 'bundle.js');

      const prodEnv = await environmentRepository.findOne({
        _parentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      const publishResponse = await session.testAgent
        .post(`/v2/environments/${prodEnv?._id}/publish`)
        .send({ sourceEnvironmentId: session.environment._id, dryRun: false });

      expect(publishResponse.status).to.equal(200);

      const prodTemplate = await messageTemplateRepository.findOne({
        _environmentId: prodEnv?._id,
        type: StepTypeEnum.DELAY,
      });
      expect(prodTemplate?.stepResolverHash).to.equal(deployResponse.body.stepResolverHash);
    });
  });
});
