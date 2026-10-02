jest.mock('../../utils/provider-overrides', () => ({
  stitchProviderOverridesFromDocs: (docs: Array<{ providerId?: string; controls?: Record<string, unknown> }>) => {
    const stitched: Record<string, Record<string, unknown>> = {};

    for (const doc of docs) {
      if (!doc.providerId) {
        continue;
      }

      stitched[doc.providerId] = doc.controls ?? {};
    }

    if (Object.keys(stitched).length === 0) {
      return undefined;
    }

    return stitched;
  },
}));

import { ControlValuesRepository, NotificationTemplateEntity } from '@novu/dal';
import {
  ChatProviderIdEnum,
  ControlValuesLevelEnum,
  EnvironmentTypeEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  UserSessionData,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { BuildVariableSchemaUsecase } from '../build-variable-schema';
import { GetWorkflowByIdsUseCase } from '../workflow';
import { BuildStepDataCommand } from './build-step-data.command';
import { BuildStepDataUsecase } from './build-step-data.usecase';

const variablesSchema = { type: 'object', properties: {} } as JSONSchemaDto;

describe('BuildStepDataUsecase', () => {
  let getWorkflowByIdsUseCase: sinon.SinonStubbedInstance<GetWorkflowByIdsUseCase>;
  let controlValuesRepository: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let buildVariableSchemaUsecase: sinon.SinonStubbedInstance<BuildVariableSchemaUsecase>;
  let usecase: BuildStepDataUsecase;

  const user = {
    _id: 'user-id',
    environmentId: 'env-id',
    organizationId: 'org-id',
  } as UserSessionData;

  const workflow = {
    _id: 'workflow-id',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    triggers: [{ identifier: 'welcome' }],
    steps: [
      {
        _id: 'step-1',
        _templateId: 'template-1',
        stepId: 'email-step',
        name: 'Email',
        template: { type: StepTypeEnum.EMAIL },
      },
      {
        _id: 'step-2',
        _templateId: 'template-2',
        stepId: 'sms-step',
        name: 'Sms',
        template: { type: StepTypeEnum.SMS },
      },
    ],
  } as unknown as NotificationTemplateEntity;

  beforeEach(() => {
    getWorkflowByIdsUseCase = sinon.createStubInstance(GetWorkflowByIdsUseCase);
    controlValuesRepository = sinon.createStubInstance(ControlValuesRepository);
    buildVariableSchemaUsecase = sinon.createStubInstance(BuildVariableSchemaUsecase);
    usecase = new BuildStepDataUsecase(
      getWorkflowByIdsUseCase as unknown as GetWorkflowByIdsUseCase,
      controlValuesRepository as unknown as ControlValuesRepository,
      buildVariableSchemaUsecase as unknown as BuildVariableSchemaUsecase
    );
    buildVariableSchemaUsecase.execute.resolves(variablesSchema);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('builds every step from one controls read and one environment context', async () => {
    const environmentContext = {
      rawEnvVars: [],
      environment: { name: 'Development', type: EnvironmentTypeEnum.DEV },
    };
    controlValuesRepository.find.resolves([
      {
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        _stepId: 'template-1',
        controls: { subject: 'Hello' },
      },
      {
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        _stepId: 'template-2',
        controls: { body: 'Sms body' },
      },
      {
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
        _stepId: 'template-1',
        providerId: ChatProviderIdEnum.Slack,
        controls: { text: 'override' },
      },
    ] as never);
    buildVariableSchemaUsecase.loadEnvironmentContext.resolves(environmentContext);

    const sharedContext = await usecase.loadWorkflowBuildContext(workflow, user);
    const emailStep = await usecase.execute(
      BuildStepDataCommand.create(
        {
          user,
          workflowIdOrInternalId: workflow._id,
          stepIdOrInternalId: 'step-1',
        },
        { sharedContext }
      )
    );
    const smsStep = await usecase.execute(
      BuildStepDataCommand.create(
        {
          user,
          workflowIdOrInternalId: workflow._id,
          stepIdOrInternalId: 'step-2',
        },
        { sharedContext }
      )
    );

    expect(controlValuesRepository.find.calledOnce).to.equal(true);
    expect(controlValuesRepository.findOne.called).to.equal(false);
    expect(getWorkflowByIdsUseCase.execute.called).to.equal(false);
    expect(buildVariableSchemaUsecase.loadEnvironmentContext.calledOnce).to.equal(true);
    expect(buildVariableSchemaUsecase.execute.calledTwice).to.equal(true);
    expect(buildVariableSchemaUsecase.execute.getCall(0).args[0].preloadedControlValues).to.equal(
      sharedContext.stepControlValues
    );
    expect(buildVariableSchemaUsecase.execute.getCall(1).args[0].preloadedEnvironmentContext).to.equal(
      environmentContext
    );
    expect(emailStep.controlValues).to.deep.equal({ subject: 'Hello' });
    expect(emailStep.providerOverrides).to.deep.equal({ [ChatProviderIdEnum.Slack]: { text: 'override' } });
    expect(smsStep.controlValues).to.deep.equal({ body: 'Sms body' });
    expect(smsStep.providerOverrides).to.equal(undefined);
  });

  it('still loads the workflow and step controls when no shared context is provided', async () => {
    getWorkflowByIdsUseCase.execute.resolves(workflow);
    controlValuesRepository.findOne.resolves({ controls: { subject: 'Hello' } } as never);
    controlValuesRepository.find.resolves([]);

    const step = await usecase.execute(
      BuildStepDataCommand.create({
        user,
        workflowIdOrInternalId: workflow._id,
        stepIdOrInternalId: 'step-1',
      })
    );

    expect(getWorkflowByIdsUseCase.execute.calledOnce).to.equal(true);
    expect(controlValuesRepository.findOne.calledOnce).to.equal(true);
    expect(controlValuesRepository.find.calledOnce).to.equal(true);
    expect(buildVariableSchemaUsecase.loadEnvironmentContext.called).to.equal(false);
    expect(step.controlValues).to.deep.equal({ subject: 'Hello' });
  });
});
