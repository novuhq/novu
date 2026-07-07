import { Injectable } from '@nestjs/common';
import {
  BuildStepDataUsecase,
  BuildStepIssuesUsecase,
  BuildVariableSchemaUsecase,
  computeWorkflowStatus,
  generatePayloadExample,
  JSONSchemaDto,
  StepIssuesDto,
  StepResponseDto,
  toResponseWorkflowDto,
  WorkflowResponseDto,
  WorkflowWithPreferencesResponseDto,
} from '@novu/application-generic';
import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import { DiscoverStepOutput, DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  ResourceOriginEnum,
  ResourceTypeEnum,
  SeverityLevelEnum,
  StepTypeEnum,
  TriggerTypeEnum,
  UserSessionData,
} from '@novu/shared';
import {
  buildDiscoveredWorkflowRawData,
  buildVirtualInternalId,
  getDiscoveredWorkflowActive,
  getDiscoveredWorkflowDescription,
  getDiscoveredWorkflowName,
  getDiscoveredWorkflowPreferences,
  getDiscoveredWorkflowTags,
} from '../../utils/discover-workflow.mapper';
import { BuildVirtualWorkflowsCommand } from './build-virtual-workflows.command';

/**
 * Maps a bridge `discover` response into `WorkflowResponseDto`s without
 * persisting anything. Used by the dashboard's "Local" environment mode to
 * render workflows that live only on the developer's machine.
 */
@Injectable()
export class BuildVirtualWorkflows {
  constructor(
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    private buildVariableSchemaUsecase: BuildVariableSchemaUsecase
  ) {}

  async execute(command: BuildVirtualWorkflowsCommand): Promise<WorkflowResponseDto[]> {
    return Promise.all(command.discoveredWorkflows.map((workflow) => this.buildVirtualWorkflow(command, workflow)));
  }

  private async buildVirtualWorkflow(
    command: BuildVirtualWorkflowsCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<WorkflowResponseDto> {
    const steps = await this.mapVirtualSteps(command, workflow);
    const virtualEntity = this.buildVirtualEntity(command, workflow, steps);

    const stepDtos = await Promise.all(
      steps.map((step) => this.buildVirtualStepResponse(command, virtualEntity, step))
    );
    const payloadExample = await generatePayloadExample(virtualEntity);

    const workflowWithPreferences: WorkflowWithPreferencesResponseDto = Object.assign(
      new WorkflowWithPreferencesResponseDto(),
      virtualEntity,
      {
        userPreferences: null,
        defaultPreferences: getDiscoveredWorkflowPreferences(workflow),
      }
    );

    return toResponseWorkflowDto(workflowWithPreferences, stepDtos, payloadExample);
  }

  private async mapVirtualSteps(
    command: BuildVirtualWorkflowsCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<NotificationStepEntity[]> {
    return Promise.all(
      (workflow.steps ?? []).map(async (step: DiscoverStepOutput) => {
        const issues: StepIssuesDto = await this.buildStepIssuesUsecase.execute({
          workflowOrigin: ResourceOriginEnum.EXTERNAL,
          user: {
            _id: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          } as UserSessionData,
          stepType: step.type as StepTypeEnum,
          controlSchema: step.controls?.schema as unknown as JSONSchemaDto,
        });

        const stepInternalId = buildVirtualInternalId(`${workflow.workflowId}/${step.stepId}`);

        return {
          _id: stepInternalId,
          _templateId: stepInternalId,
          template: {
            _id: stepInternalId,
            type: step.type,
            name: step.stepId,
            controls: step.controls,
            output: step.outputs,
            options: step.options,
            code: step.code,
          },
          name: step.stepId,
          stepId: step.stepId,
          uuid: step.stepId,
          shouldStopOnFail: (step.options as Record<string, any>)?.failOnErrorEnabled ?? false,
          issues,
        } as unknown as NotificationStepEntity;
      })
    );
  }

  private buildVirtualEntity(
    command: BuildVirtualWorkflowsCommand,
    workflow: DiscoverWorkflowOutput,
    steps: NotificationStepEntity[]
  ): NotificationTemplateEntity {
    const workflowActive = getDiscoveredWorkflowActive(workflow);
    const now = new Date().toISOString();

    return {
      _id: buildVirtualInternalId(workflow.workflowId),
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      name: getDiscoveredWorkflowName(workflow),
      description: getDiscoveredWorkflowDescription(workflow),
      tags: getDiscoveredWorkflowTags(workflow),
      active: workflowActive,
      draft: !workflowActive,
      type: ResourceTypeEnum.BRIDGE,
      origin: ResourceOriginEnum.EXTERNAL,
      triggers: [
        {
          type: TriggerTypeEnum.EVENT,
          identifier: workflow.workflowId,
          variables: [],
        },
      ],
      steps,
      payloadSchema: workflow.payload?.schema,
      status: computeWorkflowStatus(workflowActive, steps),
      severity: workflow.severity || SeverityLevelEnum.NONE,
      rawData: buildDiscoveredWorkflowRawData(workflow),
      createdAt: now,
      updatedAt: now,
    } as unknown as NotificationTemplateEntity;
  }

  private async buildVirtualStepResponse(
    command: BuildVirtualWorkflowsCommand,
    virtualEntity: NotificationTemplateEntity,
    step: NotificationStepEntity
  ): Promise<StepResponseDto> {
    const variables = await this.buildVariableSchemaUsecase.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      stepInternalId: step._templateId,
      workflow: virtualEntity,
      // Virtual workflows have no persisted control values; skip the DB lookup.
      preloadedControlValues: [],
    });

    return BuildStepDataUsecase.mapToStepResponse(virtualEntity, step, {}, variables);
  }
}
