import { Novu } from '@novu/api';
import { WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { FeatureFlagsService, ResourceValidatorService } from '@novu/application-generic';
import {
  ControlValuesRepository,
  EnvironmentRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { ControlValuesLevelEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { CloudflareStepResolverDeployService } from '../services/cloudflare-step-resolver-deploy.service';

describe('Step Resolvers #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let sandbox: sinon.SinonSandbox;
  let workflowId: string;
  let stepId: string;
  let stepInternalId: string;
  let workflowInternalId: string;

  const messageTemplateRepository = new MessageTemplateRepository();
  const controlValuesRepository = new ControlValuesRepository();
  const environmentRepository = new EnvironmentRepository();
  const workflowRepository = new NotificationTemplateRepository();

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    sandbox.stub(CloudflareStepResolverDeployService.prototype, 'deploy').resolves();
    sandbox.stub(FeatureFlagsService.prototype, 'getFlag').resolves(true);
    sandbox.stub(ResourceValidatorService.prototype, 'getStepResolversAvailableSlots').resolves(9999);
    sandbox.stub(ResourceValidatorService.prototype, 'validateStepResolversLimit').resolves();

    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);

    const uid = Date.now();
    const { result } = await novuClient.workflows.create({
      name: `Test Workflow ${uid}`,
      workflowId: `test-workflow-${uid}`,
      steps: [{ name: 'Email Step', type: 'email' as const, controlValues: { subject: 'Test Subject' } }],
      source: WorkflowCreationSourceEnum.Editor,
    });

    workflowId = result.workflowId;
    const firstStep = result.steps[0];
    if (firstStep.type === 'UNKNOWN') throw new Error('Unexpected unknown step type');
    stepId = firstStep.stepId;

    const workflow = await workflowRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: workflowId } },
    });
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    stepInternalId = String(workflow.steps[0]._templateId);
    workflowInternalId = String(workflow._id);
  });

  afterEach(() => {
    sandbox.restore();
  });

  async function deployStep(
    options: {
      workflowId: string;
      stepId: string;
      stepType?: StepTypeEnum;
      controlSchema?: Record<string, unknown>;
    },
    agent = session.testAgent
  ) {
    const bundle = Buffer.from('export default { fetch: () => new Response("ok") }');
    const stepType = options.stepType ?? StepTypeEnum.EMAIL;
    const manifest = JSON.stringify({
      steps: [
        {
          workflowId: options.workflowId,
          stepId: options.stepId,
          stepType,
          ...(options.controlSchema ? { controlSchema: options.controlSchema } : {}),
        },
      ],
    });

    return agent
      .post('/v2/step-resolvers/deploy')
      .attach('bundle', bundle, { filename: 'worker.mjs', contentType: 'application/javascript+module' })
      .field('manifest', manifest);
  }

  async function createActionWorkflow(actionStepType: StepTypeEnum.DELAY | StepTypeEnum.DIGEST | StepTypeEnum.THROTTLE) {
    const uid = Date.now();
    const { result } = await novuClient.workflows.create({
      name: `${actionStepType} Workflow ${uid}`,
      workflowId: `${actionStepType}-workflow-${uid}`,
      steps: [{ name: `${actionStepType} Step`, type: actionStepType as unknown as 'digest' }],
      source: WorkflowCreationSourceEnum.Editor,
    });

    const actionWorkflow = await workflowRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      triggers: { $elemMatch: { identifier: result.workflowId } },
    });
    if (!actionWorkflow) throw new Error(`Action workflow not found: ${result.workflowId}`);

    const actionStepInternalId = String(actionWorkflow.steps[0]._templateId);
    const rawStep = result.steps[0] as unknown as { stepId?: string; type?: string; raw?: { stepId?: string } };
    const actionStepId = rawStep?.raw?.stepId ?? rawStep?.stepId;
    if (!actionStepId) throw new Error(`Could not resolve stepId for ${actionStepType} step`);

    return {
      workflowId: result.workflowId,
      stepId: actionStepId,
      stepInternalId: actionStepInternalId,
    };
  }

  async function seedControlValues(controls: Record<string, unknown>) {
    await controlValuesRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      _stepId: stepInternalId,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });
    await controlValuesRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      _workflowId: workflowInternalId,
      _stepId: stepInternalId,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      priority: 0,
      controls,
    });
  }

  describe('POST /v2/step-resolvers/deploy', () => {
    it('should write stepResolverHash to MessageTemplate and create ControlValues', async () => {
      const { body, status } = await deployStep({ workflowId, stepId });

      expect(status).to.equal(201);
      expect(body.data.stepResolverHash).to.match(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
      expect(body.data.workerId).to.match(/^sr-/);
      expect(body.data.deployedStepsCount).to.equal(1);
      expect(body.data.deployedAt).to.be.a('string');

      const template = await messageTemplateRepository.findOne({
        _id: stepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.equal(body.data.stepResolverHash);

      const controlValues = await controlValuesRepository.findOne({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _stepId: stepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(controlValues).to.exist;
    });

    it('should write controlSchema to MessageTemplate.controls.schema when provided', async () => {
      const controlSchema = {
        type: 'object',
        properties: { headline: { type: 'string' } },
        additionalProperties: false,
        required: [],
      };

      const { status } = await deployStep({ workflowId, stepId, controlSchema });

      expect(status).to.equal(201);

      const template = await messageTemplateRepository.findOne({
        _id: stepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.controls?.schema).to.deep.equal(controlSchema);
    });

    it('should preserve existing control values that match the redeployed schema', async () => {
      const controlSchema = {
        type: 'object',
        properties: { headline: { type: 'string' } },
        additionalProperties: false,
        required: [],
      };
      await seedControlValues({ headline: 'Hello' });

      await deployStep({ workflowId, stepId, controlSchema });

      const allControlValues = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _stepId: stepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(allControlValues).to.have.lengthOf(1);
      expect((allControlValues[0].controls as Record<string, unknown>).headline).to.equal('Hello');
    });

    it('should prune control values for fields removed from the schema on redeploy', async () => {
      const controlSchema = {
        type: 'object',
        properties: { headline: { type: 'string' } },
        additionalProperties: false,
        required: [],
      };
      await seedControlValues({ headline: 'Hello', oldField: 'gone' });

      await deployStep({ workflowId, stepId, controlSchema });

      const allControlValues = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _stepId: stepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(allControlValues).to.have.lengthOf(1);
      expect(allControlValues[0].controls).to.deep.equal({ headline: 'Hello' });
    });

    it('should wipe all existing control values when redeploying without a controlSchema', async () => {
      await seedControlValues({ headline: 'Hello' });

      await deployStep({ workflowId, stepId });

      const allControlValues = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _stepId: stepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(allControlValues).to.have.lengthOf(1);
      expect(allControlValues[0].controls).to.deep.equal({});
    });

    it('should return 400 when manifest stepType does not match the actual step type', async () => {
      const { body, status } = await deployStep({ workflowId, stepId, stepType: StepTypeEnum.SMS });

      expect(status).to.equal(400);
      expect(JSON.stringify(body)).to.include('does not match');

      const template = await messageTemplateRepository.findOne({
        _id: stepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.not.exist;
    });

    it('should return 400 when no bundle file is provided', async () => {
      const manifest = JSON.stringify({
        steps: [{ workflowId, stepId, stepType: StepTypeEnum.EMAIL }],
      });

      const { body, status } = await session.testAgent.post('/v2/step-resolvers/deploy').field('manifest', manifest);

      expect(status).to.equal(400);
      expect(JSON.stringify(body)).to.include('Bundle file is required');
    });

    describe('Action step types (delay, digest, throttle)', () => {
      for (const actionStepType of [StepTypeEnum.DELAY, StepTypeEnum.DIGEST, StepTypeEnum.THROTTLE] as const) {
        it(`should deploy step resolver for a ${actionStepType} step`, async () => {
          const { workflowId: actionWorkflowId, stepId: actionStepId, stepInternalId: actionStepInternalId } =
            await createActionWorkflow(actionStepType);

          const { body, status } = await deployStep({
            workflowId: actionWorkflowId,
            stepId: actionStepId,
            stepType: actionStepType,
          });

          expect(status).to.equal(201);
          expect(body.data.stepResolverHash).to.match(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
          expect(body.data.deployedStepsCount).to.equal(1);

          const template = await messageTemplateRepository.findOne({
            _id: actionStepInternalId,
            _environmentId: session.environment._id,
          });
          expect(template?.stepResolverHash).to.equal(body.data.stepResolverHash);
        });
      }
    });
  });

  describe('DELETE /v2/step-resolvers/:stepInternalId/disconnect', () => {
    it('should clear stepResolverHash, delete ControlValues, and reset controls.schema', async () => {
      await deployStep({ workflowId, stepId });

      const { status } = await session.testAgent
        .delete(`/v2/step-resolvers/${stepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.EMAIL });

      expect(status).to.equal(200);

      const template = await messageTemplateRepository.findOne({
        _id: stepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.not.exist;

      const controlValues = await controlValuesRepository.findOne({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _stepId: stepInternalId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
      expect(controlValues).to.not.exist;

      expect(template?.controls?.schema).to.have.property('type', 'object');
      expect(template?.controls?.schema).to.have.property('additionalProperties', false);
    });

    it('should disconnect step resolver from a delay step and reset schema to default', async () => {
      const { workflowId: delayWorkflowId, stepId: delayStepId, stepInternalId: delayStepInternalId } =
        await createActionWorkflow(StepTypeEnum.DELAY);

      await deployStep({ workflowId: delayWorkflowId, stepId: delayStepId, stepType: StepTypeEnum.DELAY });

      const { status } = await session.testAgent
        .delete(`/v2/step-resolvers/${delayStepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.DELAY });

      expect(status).to.equal(200);

      const template = await messageTemplateRepository.findOne({
        _id: delayStepInternalId,
        _environmentId: session.environment._id,
      });
      expect(template?.stepResolverHash).to.not.exist;
    });

    it('should return 400 when the provided stepType does not support step resolvers', async () => {
      const { body, status } = await session.testAgent
        .delete(`/v2/step-resolvers/${stepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.TRIGGER });

      expect(status).to.equal(400);
      expect(JSON.stringify(body)).to.include('does not support step resolvers');
    });
  });

  describe('GET /v2/step-resolvers/count', () => {
    it('should return the correct count across the deploy + disconnect lifecycle', async () => {
      const isolatedSession = new UserSession();
      await isolatedSession.initialize();
      const isolatedClient = initNovuClassSdkInternalAuth(isolatedSession);

      async function isolatedCount(): Promise<number> {
        const { body } = await isolatedSession.testAgent.get('/v2/step-resolvers/count').expect(200);

        return body.data.count;
      }

      let counter = 0;
      async function createWorkflowInIsolatedSession() {
        const uid = `${Date.now()}-${++counter}`;
        const { result } = await isolatedClient.workflows.create({
          name: `Count Test Workflow ${uid}`,
          workflowId: `count-test-${uid}`,
          steps: [{ name: 'Email Step', type: 'email' as const, controlValues: { subject: 'Test' } }],
          source: WorkflowCreationSourceEnum.Editor,
        });

        const wf = await workflowRepository.findOne({
          _environmentId: isolatedSession.environment._id,
          _organizationId: isolatedSession.organization._id,
          triggers: { $elemMatch: { identifier: result.workflowId } },
        });

        const firstStep = result.steps[0];
        if (firstStep.type === 'UNKNOWN') throw new Error('Unexpected unknown step type');

        return {
          workflowId: result.workflowId,
          stepId: firstStep.stepId,
          stepInternalId: String(wf!.steps[0]._templateId),
        };
      }

      expect(await isolatedCount()).to.equal(0);

      const wfA = await createWorkflowInIsolatedSession();
      await deployStep({ workflowId: wfA.workflowId, stepId: wfA.stepId }, isolatedSession.testAgent);
      expect(await isolatedCount()).to.equal(1);

      const wfB = await createWorkflowInIsolatedSession();
      await deployStep({ workflowId: wfB.workflowId, stepId: wfB.stepId }, isolatedSession.testAgent);
      expect(await isolatedCount()).to.equal(2);

      await isolatedSession.testAgent
        .delete(`/v2/step-resolvers/${wfA.stepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.EMAIL })
        .expect(200);

      expect(await isolatedCount()).to.equal(1);
    });
  });

  describe('POST /v2/environments/:id/publish (step resolver sync)', () => {
    async function getProdEnv() {
      const prodEnv = await environmentRepository.findOne({
        _parentId: session.environment._id,
        _organizationId: session.organization._id,
      });
      if (!prodEnv) throw new Error('Production environment not found');

      return prodEnv;
    }

    async function publish(targetEnvId: string) {
      return session.testAgent
        .post(`/v2/environments/${targetEnvId}/publish`)
        .send({ sourceEnvironmentId: session.environment._id, dryRun: false })
        .expect(200);
    }

    it('should copy stepResolverHash and resolver schema to production on publish', async () => {
      const prodEnv = await getProdEnv();

      const { body: deployBody } = await deployStep({ workflowId, stepId });
      const devHash = deployBody.data.stepResolverHash;

      await publish(prodEnv._id);

      const prodWorkflow = await workflowRepository.findOne({
        _environmentId: prodEnv._id,
        _organizationId: session.organization._id,
        triggers: { $elemMatch: { identifier: workflowId } },
      });
      const prodStepInternalId = String(prodWorkflow!.steps[0]._templateId);
      const prodTemplate = await messageTemplateRepository.findOne({
        _id: prodStepInternalId,
        _environmentId: prodEnv._id,
      });

      expect(prodTemplate?.stepResolverHash).to.equal(devHash);
      expect(prodTemplate?.controls?.schema).to.include({ type: 'object', additionalProperties: false });
    });

    it('should clear stepResolverHash from production when dev step is disconnected and republished', async () => {
      const prodEnv = await getProdEnv();

      await deployStep({ workflowId, stepId });
      await publish(prodEnv._id);

      await session.testAgent
        .delete(`/v2/step-resolvers/${stepInternalId}/disconnect`)
        .send({ stepType: StepTypeEnum.EMAIL })
        .expect(200);

      await publish(prodEnv._id);

      const prodWorkflow = await workflowRepository.findOne({
        _environmentId: prodEnv._id,
        _organizationId: session.organization._id,
        triggers: { $elemMatch: { identifier: workflowId } },
      });
      const prodStepInternalId = String(prodWorkflow!.steps[0]._templateId);
      const prodTemplate = await messageTemplateRepository.findOne({
        _id: prodStepInternalId,
        _environmentId: prodEnv._id,
      });

      expect(prodTemplate?.stepResolverHash).to.not.exist;
      expect(prodTemplate?.controls?.schema).to.have.property('type', 'object');
      expect(prodTemplate?.controls?.schema).to.have.property('additionalProperties', false);
    });

    it('should promote stepResolverHash to production for a delay step on publish', async () => {
      const prodEnv = await getProdEnv();

      const { workflowId: delayWorkflowId, stepId: delayStepId, stepInternalId: delayStepInternalId } =
        await createActionWorkflow(StepTypeEnum.DELAY);

      const { body: deployBody } = await deployStep({
        workflowId: delayWorkflowId,
        stepId: delayStepId,
        stepType: StepTypeEnum.DELAY,
      });
      const devHash = deployBody.data.stepResolverHash;

      await publish(prodEnv._id);

      const prodDelayWorkflow = await workflowRepository.findOne({
        _environmentId: prodEnv._id,
        _organizationId: session.organization._id,
        triggers: { $elemMatch: { identifier: delayWorkflowId } },
      });
      if (!prodDelayWorkflow) throw new Error('Prod delay workflow not found');

      const prodStepInternalId = String(prodDelayWorkflow.steps[0]._templateId);
      const prodTemplate = await messageTemplateRepository.findOne({
        _id: prodStepInternalId,
        _environmentId: prodEnv._id,
      });

      expect(prodTemplate?.stepResolverHash).to.equal(devHash);
    });
  });
});
