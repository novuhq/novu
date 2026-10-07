import { ControlValuesRepository, IntegrationRepository, JsonSchemaTypeEnum } from '@novu/dal';
import { ControlValuesLevelEnum, ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
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

  it('queries provider controls when they were not preloaded', async () => {
    await usecase.execute({
      workflowOrigin: ResourceOriginEnum.EXTERNAL,
      user: user as any,
      stepInternalId: 'step_id',
      workflow: workflow as any,
      stepType: StepTypeEnum.EMAIL,
      controlSchema: { type: JsonSchemaTypeEnum.OBJECT },
    });

    expect(controlValuesRepository.find.calledOnce).to.equal(true);
    expect(controlValuesRepository.find.firstCall.args[0]).to.include({
      _workflowId: 'workflow_id',
      _stepId: 'step_id',
      level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
    });
  });
});
