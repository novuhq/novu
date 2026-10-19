import { Injectable } from '@nestjs/common';
import {
  BuildStepDataUsecase,
  BuildStepIssuesUsecase,
  BuildVariableSchemaUsecase,
  computeWorkflowStatus,
  generatePayloadExample,
  JSONSchemaDto,
  StepForResponseMapper,
  StepForVariableSchema,
  StepIssuesDto,
  StepResponseDto,
  StepTemplateForMapper,
  toResponseWorkflowDto,
  WorkflowForPayloadExample,
  WorkflowForResponseMapper,
  WorkflowForVariableSchema,
  WorkflowResponseDto,
  WorkflowWithPreferencesForMapper,
} from '@novu/application-generic';
import { DiscoverStepOutput, DiscoverWorkflowOutput } from '@novu/framework/internal';
import { ResourceOriginEnum, ResourceTypeEnum, SeverityLevelEnum, StepTypeEnum, UserSessionData } from '@novu/shared';
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

interface VirtualStepBuild extends StepForResponseMapper, StepForVariableSchema {
  _id: string;
  uuid: string;
  shouldStopOnFail: boolean;
  template: StepTemplateForMapper & {
    _id: string;
    name: string;
    output?: DiscoverStepOutput['outputs'];
    options?: DiscoverStepOutput['options'];
    code?: DiscoverStepOutput['code'];
  };
}

interface VirtualWorkflowBuild
  extends WorkflowForResponseMapper,
    WorkflowForPayloadExample,
    WorkflowForVariableSchema,
    WorkflowWithPreferencesForMapper {
  _environmentId: string;
  _organizationId: string;
  draft: boolean;
  rawData: Record<string, unknown>;
  steps: VirtualStepBuild[];
}

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
    const virtualWorkflow = await this.buildVirtualWorkflowEntity(command, workflow);
    const stepDtos = await Promise.all(
      virtualWorkflow.steps.map((step) => this.buildVirtualStepResponse(command, virtualWorkflow, step))
    );
    const payloadExample = await generatePayloadExample(virtualWorkflow);

    return toResponseWorkflowDto(virtualWorkflow, stepDtos, payloadExample);
  }

  private async buildVirtualWorkflowEntity(
    command: BuildVirtualWorkflowsCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<VirtualWorkflowBuild> {
    const workflowActive = getDiscoveredWorkflowActive(workflow);
    const steps = await this.mapVirtualSteps(command, workflow);
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
      triggers: [{ identifier: workflow.workflowId }],
      steps,
      payloadSchema: workflow.payload?.schema,
      status: computeWorkflowStatus(workflowActive, steps),
      severity: workflow.severity || SeverityLevelEnum.NONE,
      rawData: buildDiscoveredWorkflowRawData(workflow),
      createdAt: now,
      updatedAt: now,
      userPreferences: null,
      defaultPreferences: getDiscoveredWorkflowPreferences(workflow),
    };
  }

  private async mapVirtualSteps(
    command: BuildVirtualWorkflowsCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<VirtualStepBuild[]> {
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
            type: step.type as StepTypeEnum,
            name: step.stepId,
            controls: step.controls,
            output: step.outputs,
            options: step.options,
            code: step.code,
          },
          name: step.stepId,
          stepId: step.stepId,
          uuid: step.stepId,
          shouldStopOnFail: (step.options as Record<string, unknown> | undefined)?.failOnErrorEnabled === true,
          issues,
        };
      })
    );
  }

  private async buildVirtualStepResponse(
    command: BuildVirtualWorkflowsCommand,
    virtualWorkflow: VirtualWorkflowBuild,
    step: VirtualStepBuild
  ): Promise<StepResponseDto> {
    const variables = await this.buildVariableSchemaUsecase.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      stepInternalId: step._templateId,
      workflow: virtualWorkflow,
      // Virtual workflows have no persisted control values; skip the DB lookup.
      preloadedControlValues: [],
    });

    return BuildStepDataUsecase.mapToStepResponse(virtualWorkflow, step, {}, variables);
  }
}
