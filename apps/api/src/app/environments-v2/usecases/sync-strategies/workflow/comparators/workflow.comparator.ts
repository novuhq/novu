import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { diff } from 'deep-object-diff';
import { UserSessionData } from '@novu/shared';
import { NotificationTemplateEntity } from '@novu/dal';
import { GetWorkflowUseCase, GetWorkflowCommand } from '../../../../../workflows-v2/usecases/get-workflow';
import { WorkflowNormalizer } from '../normalizers/workflow.normalizer';
import { IWorkflowComparator, IWorkflowComparison, INormalizedStep, IFieldChange } from '../types/workflow-sync.types';
import { IEntityDiff, DiffActionEnum, EntityTypeEnum } from '../../../../types/sync.types';
import { WORKFLOW_SYNC_CONSTANTS, WORKFLOW_SYNC_MESSAGES } from '../constants/workflow-sync.constants';

@Injectable()
export class WorkflowComparator implements IWorkflowComparator {
  constructor(
    private logger: PinoLogger,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private workflowNormalizer: WorkflowNormalizer
  ) {}

  async compareWorkflows(
    sourceWorkflow: NotificationTemplateEntity,
    targetWorkflow: NotificationTemplateEntity,
    userContext: UserSessionData
  ): Promise<IWorkflowComparison> {
    try {
      // Get proper WorkflowResponseDto for both workflows to ensure we have the correct structure
      const [sourceWorkflowDto, targetWorkflowDto] = await Promise.all([
        this.getWorkflowUseCase.execute(
          GetWorkflowCommand.create({
            user: {
              ...userContext,
              environmentId: sourceWorkflow._environmentId,
            },
            workflowIdOrInternalId: sourceWorkflow._id,
          })
        ),
        this.getWorkflowUseCase.execute(
          GetWorkflowCommand.create({
            user: {
              ...userContext,
              environmentId: targetWorkflow._environmentId,
            },
            workflowIdOrInternalId: targetWorkflow._id,
          })
        ),
      ]);

      // Normalize both workflows using the same logic as sync-to-environment
      const normalizedSource = this.workflowNormalizer.normalizeWorkflowForComparison(sourceWorkflowDto);
      const normalizedTarget = this.workflowNormalizer.normalizeWorkflowForComparison(targetWorkflowDto);

      // Separate steps from workflow fields
      const { steps: sourceSteps, ...sourceWithoutSteps } = normalizedSource;
      const { steps: targetSteps, ...targetWithoutSteps } = normalizedTarget;

      // Compare workflow-level fields (excluding steps)
      const workflowDifferences = diff(targetWithoutSteps, sourceWithoutSteps);
      const workflowChanges: Record<string, IFieldChange> = {};

      for (const [field, value] of Object.entries(workflowDifferences)) {
        workflowChanges[field] = {
          previous: targetWithoutSteps[field],
          new: sourceWithoutSteps[field],
        };
      }

      // Compare steps and generate step-level diffs
      const stepDiffs = this.compareStepsAsEntities(
        sourceSteps,
        targetSteps,
        sourceWorkflowDto._id,
        sourceWorkflowDto.name
      );

      return { workflowChanges, stepDiffs };
    } catch (error) {
      this.logger.error(WORKFLOW_SYNC_MESSAGES.COMPARE_FAILED(error.message));

      return { workflowChanges: {}, stepDiffs: [] };
    }
  }

  compareStepsAsEntities(
    sourceSteps: INormalizedStep[],
    targetSteps: INormalizedStep[],
    workflowId: string,
    workflowName: string
  ): IEntityDiff[] {
    const stepDiffs: IEntityDiff[] = [];

    // Create maps for efficient lookup
    const sourceStepMap = new Map(sourceSteps.map((step, index) => [step.stepId, { step, index }]));
    const targetStepMap = new Map(targetSteps.map((step, index) => [step.stepId, { step, index }]));

    const processedSteps = new Set<string>();

    // Process source steps (added/modified/moved)
    sourceSteps.forEach((sourceStep, sourceIndex) => {
      const targetStepData = targetStepMap.get(sourceStep.stepId);

      if (!targetStepData) {
        stepDiffs.push(this.createStepAddedDiff(sourceStep, sourceIndex, workflowId, workflowName));
      } else {
        const { step: targetStep, index: targetIndex } = targetStepData;
        const stepChanges = this.compareIndividualStep(sourceStep, targetStep);

        if (Object.keys(stepChanges).length > 0) {
          stepDiffs.push(
            this.createStepModifiedDiff(sourceStep, sourceIndex, targetIndex, stepChanges, workflowId, workflowName)
          );
        } else if (sourceIndex !== targetIndex) {
          stepDiffs.push(this.createStepMovedDiff(sourceStep, sourceIndex, targetIndex, workflowId, workflowName));
        }
      }

      processedSteps.add(sourceStep.stepId);
    });

    // Process deleted steps
    targetSteps.forEach((targetStep, targetIndex) => {
      if (!processedSteps.has(targetStep.stepId)) {
        stepDiffs.push(this.createStepDeletedDiff(targetStep, targetIndex, workflowId, workflowName));
      }
    });

    return stepDiffs;
  }

  private compareIndividualStep(
    sourceStep: INormalizedStep,
    targetStep: INormalizedStep
  ): Record<string, IFieldChange> {
    // Normalize steps for comparison
    const normalizedSource = this.workflowNormalizer.normalizeStepForComparison(sourceStep);
    const normalizedTarget = this.workflowNormalizer.normalizeStepForComparison(targetStep);

    // Use deep-object-diff for individual step comparison
    const differences = diff(normalizedTarget, normalizedSource);

    // Transform to expected format
    const changes: Record<string, IFieldChange> = {};
    for (const [field, value] of Object.entries(differences)) {
      changes[field] = {
        previous: normalizedTarget[field],
        new: normalizedSource[field],
      };
    }

    return changes;
  }

  private createStepAddedDiff(
    sourceStep: INormalizedStep,
    sourceIndex: number,
    workflowId: string,
    workflowName: string
  ): IEntityDiff {
    const normalizedStep = this.workflowNormalizer.normalizeStepForComparison(sourceStep);

    return {
      entityId: sourceStep.stepId,
      entityName: sourceStep.name,
      entityType: EntityTypeEnum.STEP,
      stepType: sourceStep.type,
      workflowId,
      workflowName,
      action: DiffActionEnum.STEP_ADDED,
      newIndex: sourceIndex,
      changes: {
        step: {
          previous: null,
          new: normalizedStep,
        },
      },
    };
  }

  private createStepModifiedDiff(
    sourceStep: INormalizedStep,
    sourceIndex: number,
    targetIndex: number,
    stepChanges: Record<string, IFieldChange>,
    workflowId: string,
    workflowName: string
  ): IEntityDiff {
    return {
      entityId: sourceStep.stepId,
      entityName: sourceStep.name,
      entityType: EntityTypeEnum.STEP,
      stepType: sourceStep.type,
      workflowId,
      workflowName,
      action: DiffActionEnum.STEP_MODIFIED,
      previousIndex: targetIndex,
      newIndex: sourceIndex,
      changes: stepChanges,
    };
  }

  private createStepMovedDiff(
    sourceStep: INormalizedStep,
    sourceIndex: number,
    targetIndex: number,
    workflowId: string,
    workflowName: string
  ): IEntityDiff {
    return {
      entityId: sourceStep.stepId,
      entityName: sourceStep.name,
      entityType: EntityTypeEnum.STEP,
      stepType: sourceStep.type,
      workflowId,
      workflowName,
      action: DiffActionEnum.STEP_MOVED,
      previousIndex: targetIndex,
      newIndex: sourceIndex,
    };
  }

  private createStepDeletedDiff(
    targetStep: INormalizedStep,
    targetIndex: number,
    workflowId: string,
    workflowName: string
  ): IEntityDiff {
    const normalizedStep = this.workflowNormalizer.normalizeStepForComparison(targetStep);

    return {
      entityId: targetStep.stepId,
      entityName: targetStep.name,
      entityType: EntityTypeEnum.STEP,
      stepType: targetStep.type,
      workflowId,
      workflowName,
      action: DiffActionEnum.STEP_DELETED,
      previousIndex: targetIndex,
      changes: {
        step: {
          previous: normalizedStep,
          new: null,
        },
      },
    };
  }
}
