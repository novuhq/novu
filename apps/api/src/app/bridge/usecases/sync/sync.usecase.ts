import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  BuildStepIssuesUsecase,
  BuildVariableSchemaUsecase,
  CreateWorkflowCommandV0,
  CreateWorkflowV0,
  computeWorkflowStatus,
  ExecuteBridgeRequest,
  GetWorkflowWithPreferencesUseCase,
  IPreloadedEnvironmentContext,
  JSONSchema,
  JSONSchemaDto,
  NotificationStep,
  STEP_CONTROL_LEVELS,
  StepIssuesDto,
  UpdateWorkflowCommandV0,
  UpdateWorkflowV0,
} from '@novu/application-generic';
import {
  ControlValuesEntity,
  ControlValuesRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import { DiscoverOutput, DiscoverStepOutput, DiscoverWorkflowOutput, GetActionEnum } from '@novu/framework/internal';
import {
  ResourceOriginEnum,
  ResourceTypeEnum,
  SeverityLevelEnum,
  StepTypeEnum,
  UserSessionData,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { assertSafeOutboundUrl, SsrfBlockedError } from '@novu/shared/utils/ssrf-url-validation';
import { isEqual } from 'es-toolkit';
import { DeleteWorkflowCommand } from '../../../workflows-v1/usecases/delete-workflow/delete-workflow.command';
import { DeleteWorkflowUseCase } from '../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { CreateBridgeResponseDto } from '../../dtos/create-bridge-response.dto';
import {
  buildDiscoveredWorkflowRawData,
  getDiscoveredWorkflowActive,
  getDiscoveredWorkflowDescription,
  getDiscoveredWorkflowName,
  getDiscoveredWorkflowPreferences,
  getDiscoveredWorkflowTags,
} from '../../utils/discover-workflow.mapper';
import { SyncCommand } from './sync.command';

interface BridgeSyncBuildContext {
  environmentContext: IPreloadedEnvironmentContext;
  controlValuesByWorkflowId: Map<string, ControlValuesEntity[]>;
  generalNotificationGroupId?: string;
}

@Injectable()
export class Sync {
  constructor(
    private createWorkflowUsecase: CreateWorkflowV0,
    private updateWorkflowUsecase: UpdateWorkflowV0,
    private deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private environmentRepository: EnvironmentRepository,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    private buildVariableSchemaUsecase: BuildVariableSchemaUsecase,
    private analyticsService: AnalyticsService,
    private controlValuesRepository: ControlValuesRepository,
    private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase
  ) {}
  async execute(command: SyncCommand): Promise<CreateBridgeResponseDto> {
    this.assertSafeBridgeUrl(command.bridgeUrl);

    const environment = await this.findEnvironment(command);
    const discover = await this.executeDiscover(command);
    this.sendAnalytics(command, environment, discover);
    const persistedWorkflowsInBridge = await this.processWorkflows(command, discover.workflows);

    await this.disposeOldWorkflows(command, persistedWorkflowsInBridge);
    await this.updateBridgeUrl(command);

    return persistedWorkflowsInBridge;
  }

  // The sync use-case persists `bridgeUrl` on the environment and immediately
  // performs a discovery request against it. Without an SSRF guard, an
  // authenticated BRIDGE_WRITE caller can repoint the bridge at internal hosts
  // (loopback, RFC1918, link-local 169.254.169.254, cloud metadata) and have
  // the API process leak the discovery response or the persisted URL to other
  // tenants.
  //
  // The synchronous `assertSafeOutboundUrl` check rejects non-http schemes,
  // embedded credentials, blocked hostnames, and private/link-local IP
  // literals (unless allow-listed via NOVU_SAFE_OUTBOUND_ALLOW). The
  // connect-time DNS-pinned guard against hostname→private resolution is
  // applied later via `enforceSsrfProtection: true` on the actual outbound
  // request — see `executeDiscover`.
  private assertSafeBridgeUrl(bridgeUrl: string | undefined): void {
    if (!bridgeUrl) {
      throw new BadRequestException('bridgeUrl is required');
    }

    try {
      assertSafeOutboundUrl(bridgeUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new BadRequestException(`bridgeUrl: ${err.message}`);
      }
      throw err;
    }
  }

  private sendAnalytics(command: SyncCommand, environment: EnvironmentEntity, discover: DiscoverOutput) {
    if (command.source !== 'sample-workspace') {
      this.analyticsService.track('Sync Request - [Bridge API]', command.userId, {
        _organization: command.organizationId,
        _environment: command.environmentId,
        environmentName: environment.name,
        workflowsCount: discover.workflows.length,
        localEnvironment: !!command.bridgeUrl?.includes('novu.sh'),
        source: command.source,
      });
    }
  }

  private async executeDiscover(command: SyncCommand): Promise<DiscoverOutput> {
    try {
      return (await this.executeBridgeRequest.execute({
        statelessBridgeUrl: command.bridgeUrl,
        environmentId: command.environmentId,
        action: GetActionEnum.DISCOVER,
        retriesLimit: 1,
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
        // User-supplied bridgeUrl: always pin the connection to a validated
        // public IP and re-validate on every redirect. Self-hosted internal
        // bridges must be allow-listed via NOVU_SAFE_OUTBOUND_ALLOW.
        enforceSsrfProtection: true,
      })) as DiscoverOutput;
    } catch (error) {
      if (error instanceof HttpException) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private async findEnvironment(command: SyncCommand): Promise<EnvironmentEntity> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    return environment;
  }

  private async updateBridgeUrl(command: SyncCommand): Promise<void> {
    await this.environmentRepository.update(
      { _id: command.environmentId },
      {
        $set: {
          echo: {
            url: command.bridgeUrl,
          },
          bridge: {
            url: command.bridgeUrl,
          },
        },
      }
    );
  }

  private async disposeOldWorkflows(
    command: SyncCommand,
    createdWorkflows: NotificationTemplateEntity[]
  ): Promise<void> {
    const persistedWorkflowIdsInBridge = createdWorkflows.map((i) => i._id);
    const workflowsToDelete = await this.findAllWorkflowsWithOtherIds(command, persistedWorkflowIdsInBridge);
    const deleteWorkflowFromStoragePromises = workflowsToDelete.map((workflow) =>
      this.deleteWorkflowUseCase.execute(
        DeleteWorkflowCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          workflowIdOrInternalId: workflow._id,
        })
      )
    );

    await Promise.all([...deleteWorkflowFromStoragePromises]);
  }

  private async findAllWorkflowsWithOtherIds(
    command: SyncCommand,
    persistedWorkflowIdsInBridge: string[]
  ): Promise<NotificationTemplateEntity[]> {
    return await this.notificationTemplateRepository.find({
      _environmentId: command.environmentId,
      type: {
        $in: [ResourceTypeEnum.ECHO, ResourceTypeEnum.BRIDGE],
      },
      origin: {
        $in: [ResourceOriginEnum.EXTERNAL, undefined, null],
      },
      _id: { $nin: persistedWorkflowIdsInBridge },
    });
  }

  private async processWorkflows(
    command: SyncCommand,
    workflowsFromBridge: DiscoverWorkflowOutput[]
  ): Promise<NotificationTemplateEntity[]> {
    const identifiers = workflowsFromBridge.map((w) => w.workflowId);
    const bulkResults = await this.notificationTemplateRepository.findByTriggerIdentifierBulk(
      command.environmentId,
      identifiers,
      { includeUpdatedBy: true }
    );
    const existingFrameworkWorkflows = workflowsFromBridge.map(
      (workflow) => bulkResults.find((r) => r.triggers.some((t) => t.identifier === workflow.workflowId)) ?? null
    );

    existingFrameworkWorkflows.forEach((workflow, index) => {
      if (workflow?.origin && workflow.origin !== ResourceOriginEnum.EXTERNAL) {
        const { workflowId } = workflowsFromBridge[index];
        throw new BadRequestException(
          `Workflow ${workflowId} was already created in Dashboard. Please use another workflowId.`
        );
      }
    });

    const unchangedWorkflows = existingFrameworkWorkflows.filter(
      (existing, index): existing is NotificationTemplateEntity =>
        !!existing && this.isWorkflowUnchanged(existing, workflowsFromBridge[index])
    );
    const workflowsToUpsert = existingFrameworkWorkflows.filter(
      (existing) => !existing || !unchangedWorkflows.includes(existing)
    );
    const [buildContext, unchangedWithPreferences] = await Promise.all([
      this.loadBuildContext(command, workflowsToUpsert),
      this.getWorkflowWithPreferencesUseCase.withPreferencesBulk(unchangedWorkflows, command),
    ]);
    const unchangedById = new Map(unchangedWithPreferences.map((workflow) => [workflow._id, workflow]));

    return Promise.all(
      workflowsFromBridge.map(async (workflow, index) => {
        const existingFrameworkWorkflow = existingFrameworkWorkflows[index];
        const unchangedWorkflow = existingFrameworkWorkflow && unchangedById.get(existingFrameworkWorkflow._id);

        return (
          unchangedWorkflow ?? (await this.upsertWorkflow(command, workflow, existingFrameworkWorkflow, buildContext))
        );
      })
    );
  }

  /**
   * A sync of an unchanged workflow would rewrite the same data. Besides the discovered workflow
   * itself, this compares the fields the dashboard or API can change on a code workflow, so a sync
   * still resets those edits.
   */
  private isWorkflowUnchanged(existing: NotificationTemplateEntity, workflow: DiscoverWorkflowOutput): boolean {
    const fields = this.getSyncedWorkflowFields(workflow);

    return (
      existing.type === ResourceTypeEnum.BRIDGE &&
      existing.name === fields.name &&
      existing.description === fields.description &&
      existing.active === fields.active &&
      isEqual(existing.tags, fields.tags) &&
      isEqual(existing.payloadSchema, fields.payloadSchema) &&
      isEqual(existing.rawData, fields.rawData) &&
      isEqual(
        existing.steps.map((step) => step.stepId),
        (workflow.steps ?? []).map((step) => step.stepId)
      )
    );
  }

  private async loadBuildContext(
    command: SyncCommand,
    existingWorkflows: Array<NotificationTemplateEntity | null>
  ): Promise<BridgeSyncBuildContext> {
    const existingWorkflowIds = existingWorkflows.flatMap((workflow) => (workflow?._id ? [workflow._id] : []));
    const hasNewWorkflow = existingWorkflows.some((workflow) => !workflow);
    const [environmentContext, controlValuesByWorkflowId, generalNotificationGroupId] = await Promise.all([
      this.buildVariableSchemaUsecase.loadEnvironmentContext(command.organizationId, command.environmentId),
      this.loadControlValuesByWorkflowId(command, existingWorkflowIds),
      hasNewWorkflow ? this.getNotificationGroup(undefined, command.environmentId) : Promise.resolve(undefined),
    ]);

    return {
      environmentContext,
      controlValuesByWorkflowId,
      generalNotificationGroupId,
    };
  }

  private async loadControlValuesByWorkflowId(
    command: SyncCommand,
    workflowIds: string[]
  ): Promise<Map<string, ControlValuesEntity[]>> {
    const grouped = new Map<string, ControlValuesEntity[]>();

    if (workflowIds.length === 0) {
      return grouped;
    }

    const controlValues = await this.controlValuesRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _workflowId: { $in: workflowIds },
        level: {
          $in: STEP_CONTROL_LEVELS,
        },
        controls: { $ne: null },
      },
      {
        controls: 1,
        _stepId: 1,
        _workflowId: 1,
        level: 1,
        providerId: 1,
        integrationIdentifier: 1,
        _id: 0,
      }
    );

    for (const controlValue of controlValues) {
      if (!controlValue._workflowId) {
        continue;
      }

      const existing = grouped.get(controlValue._workflowId);

      if (existing) {
        existing.push(controlValue);
        continue;
      }

      grouped.set(controlValue._workflowId, [controlValue]);
    }

    return grouped;
  }

  private async upsertWorkflow(
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput,
    existingFrameworkWorkflow: NotificationTemplateEntity | null,
    buildContext: BridgeSyncBuildContext
  ): Promise<NotificationTemplateEntity> {
    if (existingFrameworkWorkflow) {
      return await this.updateWorkflowUsecase.execute(
        UpdateWorkflowCommandV0.create(
          await this.mapDiscoverWorkflowToUpdateWorkflowCommand(
            existingFrameworkWorkflow,
            command,
            workflow,
            buildContext
          )
        )
      );
    }

    return await this.createWorkflow(command, workflow, buildContext);
  }

  private async createWorkflow(
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput,
    buildContext: BridgeSyncBuildContext
  ): Promise<NotificationTemplateEntity> {
    const requestedNotificationGroupId = this.castToAnyNotSupportedParam(workflow)?.notificationGroupId as
      | string
      | undefined;
    const notificationGroupId = requestedNotificationGroupId || buildContext.generalNotificationGroupId;

    if (!notificationGroupId) {
      throw new BadRequestException('Notification group not found');
    }
    const steps = await this.mapSteps(command, workflow.steps ?? [], undefined, buildContext);
    const fields = this.getSyncedWorkflowFields(workflow);

    return await this.createWorkflowUsecase.execute(
      CreateWorkflowCommandV0.create({
        ...fields,
        origin: ResourceOriginEnum.EXTERNAL,
        type: ResourceTypeEnum.BRIDGE,
        notificationGroupId,
        draft: fields.active,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        triggerIdentifier: workflow.workflowId,
        __source: WorkflowCreationSourceEnum.BRIDGE,
        steps,
        controls: {
          // biome-ignore lint/plugin: discover control schema is a loose bridge payload
          schema: workflow.controls?.schema as unknown as JSONSchema,
        },
        status: computeWorkflowStatus(fields.active, steps),
        severity: workflow.severity || SeverityLevelEnum.NONE,
      })
    );
  }

  private async mapDiscoverWorkflowToUpdateWorkflowCommand(
    workflowExist: NotificationTemplateEntity,
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput,
    buildContext: BridgeSyncBuildContext
  ): Promise<UpdateWorkflowCommandV0> {
    const steps = await this.mapSteps(command, workflow.steps ?? [], workflowExist, buildContext);

    return {
      ...this.getSyncedWorkflowFields(workflow),
      id: workflowExist._id,
      existingWorkflow: workflowExist,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      workflowId: workflow.workflowId,
      steps,
      controls: {
        // biome-ignore lint/plugin: discover control schema is a loose bridge payload
        schema: workflow.controls?.schema as unknown as JSONSchemaDto,
      },
      type: ResourceTypeEnum.BRIDGE,
    };
  }

  /** The workflow-level fields a sync writes from the discovered workflow, on create and update alike. */
  private getSyncedWorkflowFields(workflow: DiscoverWorkflowOutput) {
    return {
      name: getDiscoveredWorkflowName(workflow),
      description: getDiscoveredWorkflowDescription(workflow),
      tags: getDiscoveredWorkflowTags(workflow),
      active: getDiscoveredWorkflowActive(workflow),
      // biome-ignore lint/plugin: discover payload schema is a loose bridge payload
      payloadSchema: workflow.payload?.schema as unknown as JSONSchemaDto,
      rawData: buildDiscoveredWorkflowRawData(workflow),
      data: this.castToAnyNotSupportedParam(workflow)?.data,
      defaultPreferences: getDiscoveredWorkflowPreferences(workflow),
    };
  }

  private async mapSteps(
    command: SyncCommand,
    commandWorkflowSteps: DiscoverStepOutput[],
    workflow: NotificationTemplateEntity | undefined,
    buildContext: BridgeSyncBuildContext
  ): Promise<NotificationStep[]> {
    const preloadedControlValues = workflow?._id
      ? (buildContext.controlValuesByWorkflowId.get(workflow._id) ?? [])
      : undefined;
    const steps = commandWorkflowSteps ?? [];

    return Promise.all(
      steps.map(async (step: DiscoverStepOutput) => {
        const foundStep = workflow?.steps?.find((workflowStep) => workflowStep.stepId === step.stepId);

        const issues: StepIssuesDto = await this.buildStepIssuesUsecase.execute({
          workflowOrigin: ResourceOriginEnum.EXTERNAL,
          user: {
            _id: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          } as UserSessionData,
          stepInternalId: foundStep?._id,
          workflow,
          stepType: step.type as StepTypeEnum,
          // biome-ignore lint/plugin: discover control schema is a loose bridge payload
          controlSchema: step.controls?.schema as unknown as JSONSchemaDto,
          preloadedEnvironmentContext: buildContext.environmentContext,
          ...(preloadedControlValues ? { preloadedControlValues } : {}),
        });

        const template = {
          _id: foundStep?._id,
          type: step.type,
          name: step.stepId,
          controls: step.controls,
          output: step.outputs,
          options: step.options,
          code: step.code,
        };

        return {
          template,
          name: step.stepId,
          stepId: step.stepId,
          uuid: step.stepId,
          _templateId: foundStep?._templateId,
          shouldStopOnFail: this.castToAnyNotSupportedParam(step.options)?.failOnErrorEnabled ?? false,
          issues,
        };
      })
    );
  }

  private async getNotificationGroup(
    notificationGroupIdCommand: string | undefined,
    environmentId: string
  ): Promise<string | undefined> {
    let notificationGroupId = notificationGroupIdCommand;

    if (!notificationGroupId) {
      notificationGroupId = (
        await this.notificationGroupRepository.findOne(
          {
            name: 'General',
            _environmentId: environmentId,
          },
          '_id'
        )
      )?._id;
    }

    return notificationGroupId;
  }

  // biome-ignore lint/suspicious/noExplicitAny: bridge discover payloads include fields that are not modeled yet
  private castToAnyNotSupportedParam(param: any): any {
    // biome-ignore lint/suspicious/noExplicitAny: bridge discover payloads include fields that are not modeled yet
    return param as any;
  }
}
