jest.mock('../../utils/provider-overrides', () => ({
  stitchProviderOverridesFromDocs: () => undefined,
}));

jest.mock('../../services/feature-flags', () => ({
  FeatureFlagsService: class FeatureFlagsService {},
}));

import { EnvironmentRepository, IntegrationRepository, NotificationTemplateEntity } from '@novu/dal';
import { StepTypeEnum, UserSessionData } from '@novu/shared';
import { expect } from 'chai';
import { PinoLogger } from 'nestjs-pino';
import sinon from 'sinon';
import { StepResponseDto } from '../../dtos/workflow/step.response.dto';
import { BuildStepDataUsecase } from '../build-step-data';
import { WorkflowStepSharedContext } from '../build-step-data/build-step-data.command';
import { GetWorkflowWithPreferencesUseCase } from '../get-workflow-with-preferences';
import { GetWorkflowCommand } from './get-workflow.command';
import { GetWorkflowUseCase } from './get-workflow.usecase';

describe('GetWorkflowUseCase', () => {
  let getWorkflowWithPreferencesUseCase: sinon.SinonStubbedInstance<GetWorkflowWithPreferencesUseCase>;
  let buildStepDataUsecase: sinon.SinonStubbedInstance<BuildStepDataUsecase>;
  let integrationsRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let usecase: GetWorkflowUseCase;

  const user = {
    _id: 'user-id',
    environmentId: 'env-id',
    organizationId: 'org-id',
  } as UserSessionData;

  beforeEach(() => {
    getWorkflowWithPreferencesUseCase = sinon.createStubInstance(GetWorkflowWithPreferencesUseCase);
    buildStepDataUsecase = sinon.createStubInstance(BuildStepDataUsecase);
    integrationsRepository = sinon.createStubInstance(IntegrationRepository);
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    usecase = new GetWorkflowUseCase(
      getWorkflowWithPreferencesUseCase as unknown as GetWorkflowWithPreferencesUseCase,
      buildStepDataUsecase as unknown as BuildStepDataUsecase,
      integrationsRepository as unknown as IntegrationRepository,
      environmentRepository as unknown as EnvironmentRepository,
      { setContext: () => undefined } as unknown as PinoLogger
    );
    integrationsRepository.find.resolves([]);
    buildStepDataUsecase.execute.callsFake(
      async (command) => ({ stepId: command.stepIdOrInternalId }) as StepResponseDto
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('builds every step from one shared workflow context', async () => {
    const workflow = {
      _id: 'workflow-id',
      name: 'Welcome',
      tags: [],
      active: true,
      triggers: [{ identifier: 'welcome' }],
      userPreferences: null,
      defaultPreferences: {},
      steps: [
        { _id: 'step-1', _templateId: 'template-1', template: { type: StepTypeEnum.EMAIL } },
        { _id: 'step-2', _templateId: 'template-2', template: { type: StepTypeEnum.SMS } },
      ],
    } as unknown as NotificationTemplateEntity;
    const sharedContext = { workflow } as WorkflowStepSharedContext;

    getWorkflowWithPreferencesUseCase.execute.resolves(workflow as never);
    buildStepDataUsecase.loadWorkflowBuildContext.resolves(sharedContext);

    const result = await usecase.execute(
      GetWorkflowCommand.create({
        user,
        workflowIdOrInternalId: workflow._id,
      })
    );

    expect(getWorkflowWithPreferencesUseCase.execute.calledOnce).to.equal(true);
    expect(buildStepDataUsecase.loadWorkflowBuildContext.calledOnce).to.equal(true);
    expect(buildStepDataUsecase.loadWorkflowBuildContext.getCall(0).args[0]).to.equal(workflow);
    expect(integrationsRepository.find.calledOnce).to.equal(true);
    expect(buildStepDataUsecase.execute.calledTwice).to.equal(true);
    expect(buildStepDataUsecase.execute.getCall(0).args[0].sharedContext).to.equal(sharedContext);
    expect(buildStepDataUsecase.execute.getCall(1).args[0].sharedContext).to.equal(sharedContext);
    expect(result.steps.map((step) => step.stepId)).to.deep.equal(['step-1', 'step-2']);
  });

  it('skips the shared context load when the workflow has no steps', async () => {
    const workflow = {
      _id: 'workflow-id',
      name: 'Empty',
      tags: [],
      active: true,
      triggers: [{ identifier: 'empty' }],
      userPreferences: null,
      defaultPreferences: {},
      steps: [],
    } as unknown as NotificationTemplateEntity;

    getWorkflowWithPreferencesUseCase.execute.resolves(workflow as never);

    const result = await usecase.execute(
      GetWorkflowCommand.create({
        user,
        workflowIdOrInternalId: workflow._id,
      })
    );

    expect(buildStepDataUsecase.loadWorkflowBuildContext.called).to.equal(false);
    expect(buildStepDataUsecase.execute.called).to.equal(false);
    expect(result.steps).to.deep.equal([]);
  });
});
