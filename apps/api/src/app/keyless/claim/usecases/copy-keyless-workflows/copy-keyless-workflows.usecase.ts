import { ConflictException, Injectable } from '@nestjs/common';
import {
  GetWorkflowCommand,
  GetWorkflowUseCase,
  PinoLogger,
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
} from '@novu/application-generic';
import { NotificationTemplateRepository, PreferencesRepository } from '@novu/dal';
import { PreferencesTypeEnum, StepTypeEnum, UserSessionData } from '@novu/shared';
import { KEYLESS_WORKFLOW_IDENTIFIER } from '../../../../inbox/utils/keyless.constants';
import { DeleteWorkflowCommand } from '../../../../workflows-v1/usecases/delete-workflow/delete-workflow.command';
import { DeleteWorkflowUseCase } from '../../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { SYNCABLE_WORKFLOW_ORIGINS } from '../../../../workflows-v2/usecases/sync-to-environment';
import { mapWorkflowToCreateWorkflowDto } from '../../../../workflows-v2/usecases/sync-to-environment/map-workflow-to-upsert-dto';
import { KeylessAgentErrorCodeEnum } from '../../../keyless-agent-environment';
import {
  CompensateKeylessWorkflowCopyCommand,
  CopyKeylessWorkflowsCommand,
  CopyKeylessWorkflowsResult,
  KeylessWorkflowCopyScope,
  KeylessWorkflowPreflightResult,
} from './copy-keyless-workflows.command';

/**
 * Copies an agent keyless environment's workflows into another organization's environment.
 * Workflows are copied, not re-scoped: their steps, control values and preferences are rebuilt in the target.
 */
@Injectable()
export class CopyKeylessWorkflows {
  constructor(
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    private readonly getWorkflowUseCase: GetWorkflowUseCase,
    private readonly preferencesRepository: PreferencesRepository,
    private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private readonly deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Read-only. Throws `claim_workflow_exists` before anything is copied. */
  async preflight(scope: KeylessWorkflowCopyScope): Promise<KeylessWorkflowPreflightResult> {
    const sourceTemplates = await this.notificationTemplateRepository.find(
      { _environmentId: scope.sourceEnvironmentId, _organizationId: scope.sourceOrganizationId },
      '_id origin triggers'
    );

    const copyable: string[] = [];
    const skipped: string[] = [];
    for (const template of sourceTemplates) {
      const identifier = template.triggers?.[0]?.identifier;
      if (!identifier) {
        continue;
      }

      if (template.origin && SYNCABLE_WORKFLOW_ORIGINS.includes(template.origin)) {
        copyable.push(identifier);
      } else {
        skipped.push(identifier);
      }
    }

    if (copyable.length === 0) {
      return { toCopy: [], skipped };
    }

    const targetTemplates = await this.notificationTemplateRepository.find(
      {
        _environmentId: scope.targetEnvironmentId,
        _organizationId: scope.targetOrganizationId,
        'triggers.identifier': { $in: copyable },
      },
      'triggers'
    );
    const existing = new Set(
      targetTemplates.flatMap((template) => template.triggers.map((trigger) => trigger.identifier))
    );

    const clashes = copyable.filter(
      (identifier) => existing.has(identifier) && identifier !== KEYLESS_WORKFLOW_IDENTIFIER
    );
    if (clashes.length > 0) {
      throw new ConflictException({
        message: `Your Development environment already has workflows with these identifiers: ${clashes.join(', ')}. Rename or delete them, then open the link again.`,
        code: KeylessAgentErrorCodeEnum.CLAIM_WORKFLOW_EXISTS,
        workflowIdentifiers: clashes,
      });
    }

    return {
      toCopy: copyable.filter((identifier) => !existing.has(identifier)),
      skipped: [...copyable.filter((identifier) => existing.has(identifier)), ...skipped],
    };
  }

  /** On failure, deletes the copies it already made and rethrows. A failing `hello-world` seed is skipped instead. */
  async copy(command: CopyKeylessWorkflowsCommand): Promise<CopyKeylessWorkflowsResult> {
    const result: CopyKeylessWorkflowsResult = { copiedInternalIds: [], copied: [], skipped: [] };

    for (const workflowId of command.workflowIds) {
      try {
        const copiedInternalId = await this.copyOne(command, workflowId);
        result.copiedInternalIds.push(copiedInternalId);
        result.copied.push(workflowId);
      } catch (error) {
        const partialCopyIds = await this.findPartialCopyIds(command, workflowId);

        if (workflowId !== KEYLESS_WORKFLOW_IDENTIFIER) {
          await this.compensate({ ...command, copiedInternalIds: [...result.copiedInternalIds, ...partialCopyIds] });

          throw error;
        }

        await this.compensate({ ...command, copiedInternalIds: partialCopyIds });
        this.logger.warn(
          { err: error, sourceEnvironmentId: command.sourceEnvironmentId, workflowId },
          'Skipped copying the keyless seed workflow'
        );
        result.skipped.push(workflowId);
      }
    }

    return result;
  }

  async compensate(command: CompensateKeylessWorkflowCopyCommand): Promise<void> {
    for (const workflowInternalId of command.copiedInternalIds) {
      try {
        await this.deleteWorkflowUseCase.execute(
          DeleteWorkflowCommand.create({
            userId: command.user._id,
            environmentId: command.targetEnvironmentId,
            organizationId: command.targetOrganizationId,
            workflowIdOrInternalId: workflowInternalId,
          })
        );
      } catch (error) {
        this.logger.error(
          { err: error, targetEnvironmentId: command.targetEnvironmentId, workflowInternalId },
          'Failed to delete a workflow copied during a failed keyless claim'
        );
      }
    }
  }

  /**
   * The upsert creates the workflow before writing its controls, so a failed copy can leave it behind.
   * Preflight only lets through identifiers the target lacked, so any match is that partial copy.
   */
  private async findPartialCopyIds(command: CopyKeylessWorkflowsCommand, workflowId: string): Promise<string[]> {
    try {
      const partialCopy = await this.notificationTemplateRepository.findOne(
        {
          _environmentId: command.targetEnvironmentId,
          _organizationId: command.targetOrganizationId,
          'triggers.identifier': workflowId,
        },
        '_id'
      );

      return partialCopy ? [partialCopy._id] : [];
    } catch (error) {
      this.logger.error(
        { err: error, targetEnvironmentId: command.targetEnvironmentId, workflowId },
        'Failed to look up a partially copied workflow during a failed keyless claim'
      );

      return [];
    }
  }

  private async copyOne(command: CopyKeylessWorkflowsCommand, workflowId: string): Promise<string> {
    const sourceUser = asUserIn(command.user, command.sourceOrganizationId, command.sourceEnvironmentId);
    const sourceWorkflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({ user: sourceUser, workflowIdOrInternalId: workflowId })
    );
    const preferences = await this.preferencesRepository.find({
      _templateId: sourceWorkflow._id,
      _environmentId: command.sourceEnvironmentId,
      type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
    });

    const upserted = await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        preserveWorkflowId: true,
        user: asUserIn(command.user, command.targetOrganizationId, command.targetEnvironmentId),
        workflowDto: withoutEmailLayouts(mapWorkflowToCreateWorkflowDto(sourceWorkflow, preferences)),
      })
    );

    return upserted._id;
  }
}

function asUserIn(user: UserSessionData, organizationId: string, environmentId: string): UserSessionData {
  return { ...user, organizationId, environmentId };
}

/** Layouts are not copied, so a keyless layout id would dangle in the target. */
function withoutEmailLayouts(workflowDto: UpsertWorkflowDataCommand): UpsertWorkflowDataCommand {
  return {
    ...workflowDto,
    steps: workflowDto.steps.map((step) => {
      if (step.type !== StepTypeEnum.EMAIL || !step.controlValues || !('layoutId' in step.controlValues)) {
        return step;
      }

      const { layoutId: _layoutId, ...controlValues } = step.controlValues;

      return { ...step, controlValues };
    }),
  };
}
