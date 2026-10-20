import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import { ControlValuesLevelEnum, ResourceOriginEnum, ShortIsPrefixEnum, UserSessionData } from '@novu/shared';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';
import { StepResponseDto } from '../../dtos/workflow/step.response.dto';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { WorkflowDataContainer } from '../../services/workflow-data.container';
import { StepForResponseMapper, WorkflowForResponseMapper } from '../../types/workflow-mapper.types';
import { buildSlug } from '../../utils/build-slug';
import { InvalidStepException } from '../../utils/exceptions';
import {
  STEP_OVERRIDE_CONTROL_LEVELS,
  type StepOverrides,
  stitchStepOverridesFromDocs,
} from '../../utils/step-overrides';
import { BuildVariableSchemaUsecase } from '../build-variable-schema';
import { GetWorkflowByIdsUseCase } from '../workflow';
import { BuildStepDataCommand, WorkflowStepSharedContext } from './build-step-data.command';

const WORKFLOW_STEP_CONTROL_PROJECTION = {
  level: 1,
  controls: 1,
  _stepId: 1,
  providerId: 1,
  integrationIdentifier: 1,
} as const;

@Injectable()
export class BuildStepDataUsecase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private buildVariableSchemaUsecase: BuildVariableSchemaUsecase
  ) {}

  @InstrumentUsecase()
  async execute(
    command: BuildStepDataCommand,
    workflowDataContainer?: WorkflowDataContainer
  ): Promise<StepResponseDto> {
    // Check container for cached step data first (now supports both MongoDB ID and identifier)
    if (workflowDataContainer) {
      const cachedStep = workflowDataContainer.getStepData(
        command.workflowIdOrInternalId,
        command.stepIdOrInternalId,
        command.user.environmentId
      );
      if (cachedStep) {
        return cachedStep;
      }
    }

    const sharedContext = command.sharedContext;
    const workflow = sharedContext?.workflow ?? (await this.fetchWorkflow(command));
    const currentStep: NotificationStepEntity | undefined = await this.loadStepsFromDb(command, workflow);

    if (!currentStep || !currentStep._templateId) {
      throw new InvalidStepException(command.stepIdOrInternalId);
    }

    const controlValues = sharedContext
      ? (sharedContext.stepControlsByTemplateId.get(currentStep._templateId) ?? {})
      : await this.getControlValues(command, currentStep, workflow._id);
    const overrides = sharedContext
      ? stitchStepOverridesFromDocs(sharedContext.overrideDocsByTemplateId.get(currentStep._templateId) ?? [])
      : await this.getStepOverrides(command, currentStep, workflow._id);
    const variables = await this.buildAvailableVariableSchema(
      command,
      currentStep,
      workflow,
      command.previewPayload,
      sharedContext
    );

    return BuildStepDataUsecase.mapToStepResponse(workflow, currentStep, controlValues, variables, overrides);
  }

  @Instrument()
  async loadWorkflowBuildContext(
    workflow: NotificationTemplateEntity,
    user: Pick<UserSessionData, 'environmentId' | 'organizationId'>
  ): Promise<WorkflowStepSharedContext> {
    const [controlDocuments, environmentContext] = await Promise.all([
      this.controlValuesRepository.find(
        {
          _environmentId: user.environmentId,
          _organizationId: user.organizationId,
          _workflowId: workflow._id,
          level: {
            $in: [ControlValuesLevelEnum.STEP_CONTROLS, ...STEP_OVERRIDE_CONTROL_LEVELS],
          },
        },
        WORKFLOW_STEP_CONTROL_PROJECTION
      ),
      this.buildVariableSchemaUsecase.loadEnvironmentContext(user.organizationId, user.environmentId),
    ]);

    return {
      workflow,
      environmentContext,
      ...indexControlDocuments(controlDocuments),
    };
  }

  static mapToStepResponse(
    workflow: WorkflowForResponseMapper,
    currentStep: StepForResponseMapper,
    controlValues: Record<string, unknown>,
    variables: JSONSchemaDto,
    { providerOverrides, integrationOverrides }: StepOverrides = {}
  ): StepResponseDto {
    const stepName = currentStep.name || 'MISSING STEP NAME - PLEASE UPDATE IMMEDIATELY';
    const slug = buildSlug(stepName, ShortIsPrefixEnum.STEP, currentStep._templateId);

    return {
      controls: {
        dataSchema: currentStep.template?.controls?.schema,
        uiSchema: currentStep.template?.controls?.uiSchema,
        values: controlValues,
      },
      controlValues,
      ...(providerOverrides ? { providerOverrides } : {}),
      ...(integrationOverrides ? { integrationOverrides } : {}),
      variables,
      name: stepName,
      slug,
      _id: currentStep._templateId,
      stepId: currentStep.stepId || 'Missing Step Id',
      type: currentStep.template?.type,
      origin: workflow.origin || ResourceOriginEnum.EXTERNAL,
      workflowId: workflow.triggers[0].identifier,
      workflowDatabaseId: workflow._id,
      issues: currentStep.issues,
      stepResolverHash: currentStep.template?.stepResolverHash,
    } as StepResponseDto;
  }

  private async buildAvailableVariableSchema(
    command: BuildStepDataCommand,
    currentStep: NotificationStepEntity,
    workflow: NotificationTemplateEntity,
    previewData?: PreviewPayloadDto,
    sharedContext?: WorkflowStepSharedContext
  ) {
    return await this.buildVariableSchemaUsecase.execute({
      environmentId: command.user.environmentId,
      organizationId: command.user.organizationId,
      userId: command.user._id,
      stepInternalId: currentStep._templateId,
      workflow,
      previewData,
      ...(sharedContext
        ? {
            preloadedControlValues: sharedContext.stepControlValues,
            preloadedEnvironmentContext: sharedContext.environmentContext,
          }
        : {}),
    });
  }

  @Instrument()
  private async fetchWorkflow(command: BuildStepDataCommand) {
    return await this.getWorkflowByIdsUseCase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      environmentId: command.user.environmentId,
      organizationId: command.user.organizationId,
    });
  }

  @Instrument()
  private async getControlValues(
    command: BuildStepDataCommand,
    currentStep: NotificationStepEntity,
    _workflowId: string
  ) {
    const controlValuesEntity = await this.controlValuesRepository.findOne({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId,
      _stepId: currentStep._templateId,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    return controlValuesEntity?.controls || {};
  }

  @Instrument()
  private async getStepOverrides(
    command: BuildStepDataCommand,
    currentStep: NotificationStepEntity,
    _workflowId: string
  ): Promise<StepOverrides> {
    const overrideDocs = await this.controlValuesRepository.find({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId,
      _stepId: currentStep._templateId,
      level: { $in: STEP_OVERRIDE_CONTROL_LEVELS },
    });

    return stitchStepOverridesFromDocs(overrideDocs);
  }

  @Instrument()
  private async loadStepsFromDb(
    command: BuildStepDataCommand,
    workflow: NotificationTemplateEntity
  ): Promise<NotificationStepEntity | undefined> {
    const currentStep: NotificationStepEntity | undefined = workflow.steps.find(
      (stepItem) => stepItem._id === command.stepIdOrInternalId || stepItem.stepId === command.stepIdOrInternalId
    );

    if (!currentStep) {
      throw new BadRequestException({
        message: 'No step found',
        stepId: command.stepIdOrInternalId,
        workflowId: command.workflowIdOrInternalId,
      });
    }

    return currentStep;
  }
}

function indexControlDocuments(
  documents: ControlValuesEntity[]
): Pick<WorkflowStepSharedContext, 'stepControlsByTemplateId' | 'overrideDocsByTemplateId' | 'stepControlValues'> {
  const stepControlsByTemplateId = new Map<string, Record<string, unknown>>();
  const overrideDocsByTemplateId = new Map<string, ControlValuesEntity[]>();
  const stepControlValues: ControlValuesEntity[] = [];

  for (const document of documents) {
    if (document.level === ControlValuesLevelEnum.STEP_CONTROLS) {
      if (document.controls != null) {
        stepControlValues.push(document);
      }

      if (document._stepId && !stepControlsByTemplateId.has(document._stepId)) {
        stepControlsByTemplateId.set(document._stepId, document.controls || {});
      }

      continue;
    }

    if (STEP_OVERRIDE_CONTROL_LEVELS.includes(document.level) && document._stepId) {
      const existing = overrideDocsByTemplateId.get(document._stepId);

      if (existing) {
        existing.push(document);
      } else {
        overrideDocsByTemplateId.set(document._stepId, [document]);
      }
    }
  }

  return { stepControlsByTemplateId, overrideDocsByTemplateId, stepControlValues };
}
