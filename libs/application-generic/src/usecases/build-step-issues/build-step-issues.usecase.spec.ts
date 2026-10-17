import { ControlValuesRepository, IntegrationRepository, JsonSchemaTypeEnum } from '@novu/dal';
import {
  ContentIssueEnum,
  ControlValuesLevelEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  ToolProviderIdEnum,
} from '@novu/shared';
import { expect } from 'chai';
import { PinoLogger } from 'nestjs-pino';
import sinon from 'sinon';
import { FeatureFlagsService } from '../../services';
import { BuildVariableSchemaUsecase } from '../build-variable-schema';
import { TierRestrictionsValidateUsecase } from '../tier-restrictions-validate';
import { BuildStepIssuesUsecase } from './build-step-issues.usecase';

describe('BuildStepIssuesUsecase', () => {
  let buildVariableSchemaUsecase: sinon.SinonStubbedInstance<BuildVariableSchemaUsecase>;
  let controlValuesRepository: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let tierRestrictionsValidateUsecase: sinon.SinonStubbedInstance<TierRestrictionsValidateUsecase>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let usecase: BuildStepIssuesUsecase;

  const user = {
    _id: 'user_id',
    environmentId: 'env_id',
    organizationId: 'org_id',
  };
  const workflow = {
    _id: 'workflow_id',
    steps: [],
  };
  const environmentContext = {
    rawEnvVars: [],
    environment: null,
  };

  beforeEach(() => {
    buildVariableSchemaUsecase = sinon.createStubInstance(BuildVariableSchemaUsecase);
    controlValuesRepository = sinon.createStubInstance(ControlValuesRepository);
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    tierRestrictionsValidateUsecase = sinon.createStubInstance(TierRestrictionsValidateUsecase);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);

    buildVariableSchemaUsecase.execute.resolves({ type: 'object', properties: {} } as any);
    tierRestrictionsValidateUsecase.execute.resolves(null as any);
    featureFlagsService.getFlag.resolves(false as any);
    controlValuesRepository.find.resolves([]);

    usecase = new BuildStepIssuesUsecase(
      buildVariableSchemaUsecase as any,
      controlValuesRepository as any,
      integrationRepository as any,
      tierRestrictionsValidateUsecase as any,
      featureFlagsService as any,
      {} as PinoLogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('does not query provider controls when control values were preloaded', async () => {
    await usecase.execute({
      workflowOrigin: ResourceOriginEnum.EXTERNAL,
      user: user as any,
      stepInternalId: 'step_id',
      workflow: workflow as any,
      stepType: StepTypeEnum.EMAIL,
      controlSchema: { type: JsonSchemaTypeEnum.OBJECT },
      preloadedControlValues: [
        {
          _stepId: 'step_id',
          level: ControlValuesLevelEnum.STEP_CONTROLS,
          controls: { subject: 'Hello' },
        } as any,
      ],
      preloadedEnvironmentContext: environmentContext,
    });

    expect(controlValuesRepository.find.called).to.equal(false);
    expect(buildVariableSchemaUsecase.execute.firstCall.args[0].preloadedEnvironmentContext).to.deep.equal(
      environmentContext
    );
    expect(buildVariableSchemaUsecase.execute.firstCall.args[0].preloadedControlValues).to.have.length(1);
  });

  it('uses preloaded provider controls instead of querying per step', async () => {
    await usecase.execute({
      workflowOrigin: ResourceOriginEnum.EXTERNAL,
      user: user as any,
      stepInternalId: 'step_id',
      workflow: workflow as any,
      stepType: StepTypeEnum.EMAIL,
      controlSchema: { type: JsonSchemaTypeEnum.OBJECT },
      preloadedControlValues: [
        {
          _stepId: 'step_id',
          level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
          providerId: 'webhook',
          controls: { subject: 'from provider' },
        } as any,
      ],
    });

    expect(controlValuesRepository.find.called).to.equal(false);
  });

  it('queries provider and integration controls together when they were not preloaded', async () => {
    await usecase.execute({
      workflowOrigin: ResourceOriginEnum.EXTERNAL,
      user: user as any,
      stepInternalId: 'step_id',
      workflow: workflow as any,
      stepType: StepTypeEnum.EMAIL,
      controlSchema: { type: JsonSchemaTypeEnum.OBJECT },
    });

    expect(controlValuesRepository.find.calledOnce).to.equal(true);
    expect(controlValuesRepository.find.firstCall.args[0]).to.deep.include({
      _environmentId: 'env_id',
      _organizationId: 'org_id',
      _workflowId: 'workflow_id',
      _stepId: 'step_id',
      level: {
        $in: [ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS, ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS],
      },
    });
  });

  describe('integration overrides', () => {
    const invalidIssuePath = `integrationOverrides.${ToolProviderIdEnum.Opsgenie}.ops-eu.foo`;
    const invalidIntegrationDoc = {
      _stepId: 'step_id',
      level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
      providerId: ToolProviderIdEnum.Opsgenie,
      integrationIdentifier: 'ops-eu',
      controls: { message: 'db is down', foo: 'bar' },
    };

    const executeToolStep = (overrides: Record<string, unknown>) =>
      usecase.execute({
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
        user: user as any,
        stepInternalId: 'step_id',
        workflow: workflow as any,
        stepType: StepTypeEnum.TOOL,
        controlSchema: { type: JsonSchemaTypeEnum.OBJECT },
        ...overrides,
      });

    it('reports issues from the request dto under the integration namespace', async () => {
      const issues = await executeToolStep({
        integrationOverridesDto: {
          [ToolProviderIdEnum.Opsgenie]: { 'ops-eu': { message: 'db is down', foo: 'bar' } },
        },
        preloadedControlValues: [],
      });

      expect(issues.controls?.[invalidIssuePath]).to.deep.equal([
        {
          message: '"foo" is not a supported property',
          issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
          variableName: invalidIssuePath,
        },
      ]);
    });

    it('prefers the request dto over persisted integration overrides', async () => {
      const issues = await executeToolStep({
        integrationOverridesDto: { [ToolProviderIdEnum.Opsgenie]: { 'ops-eu': { message: 'fixed' } } },
        preloadedControlValues: [invalidIntegrationDoc as any],
      });

      expect(issues.controls?.[invalidIssuePath]).to.equal(undefined);
    });

    it('reports issues from preloaded integration docs without querying', async () => {
      const issues = await executeToolStep({ preloadedControlValues: [invalidIntegrationDoc as any] });

      expect(controlValuesRepository.find.called).to.equal(false);
      expect(issues.controls?.[invalidIssuePath]).to.have.length(1);
    });

    it('reports issues from persisted integration docs when nothing was preloaded', async () => {
      controlValuesRepository.find.resolves([invalidIntegrationDoc as any]);

      const issues = await executeToolStep({});

      expect(issues.controls?.[invalidIssuePath]).to.have.length(1);
      expect(issues.controls?.[`providerOverrides.${ToolProviderIdEnum.Opsgenie}.foo`]).to.equal(undefined);
    });

    it('ignores persisted integration overrides when the request deletes them', async () => {
      const issues = await executeToolStep({
        integrationOverridesDto: null,
        preloadedControlValues: [invalidIntegrationDoc as any],
      });

      expect(issues.controls?.[invalidIssuePath]).to.equal(undefined);
    });

    it('does not read persisted override docs when the request carries both override layers', async () => {
      await executeToolStep({ providerOverridesDto: {}, integrationOverridesDto: {} });

      expect(controlValuesRepository.find.called).to.equal(false);
    });

    it('keeps reading persisted provider overrides when only integration overrides are in the request', async () => {
      controlValuesRepository.find.resolves([
        {
          _stepId: 'step_id',
          level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
          providerId: ToolProviderIdEnum.Opsgenie,
          controls: { foo: 'bar' },
        } as any,
      ]);

      const issues = await executeToolStep({ integrationOverridesDto: {} });

      expect(issues.controls?.[`providerOverrides.${ToolProviderIdEnum.Opsgenie}.foo`]).to.have.length(1);
    });

    it('validates Liquid inside integration overrides under the integration namespace', async () => {
      const issues = await executeToolStep({
        integrationOverridesDto: { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { event: '{{ payload.event' } } },
        preloadedControlValues: [],
      });

      expect(issues.controls?.[`integrationOverrides.${ToolProviderIdEnum.Webhook}.prod-alerts.event`]).to.have.length(
        1
      );
    });
  });
});
