import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { diff } from 'deep-object-diff';
import { UserSessionData } from '@novu/shared';
import { NotificationTemplateEntity } from '@novu/dal';
import { GetWorkflowUseCase, GetWorkflowCommand } from '../../../../../workflows-v2/usecases/get-workflow';
import { WorkflowNormalizer } from '../normalizers/workflow.normalizer';
import { IWorkflowComparator, IWorkflowComparison, INormalizedStep } from '../types/workflow-sync.types';
import { IResourceDiff, DiffActionEnum, ResourceTypeEnum } from '../../../../types/sync.types';
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
      const normalizedSource = this.workflowNormalizer.normalizeWorkflow(sourceWorkflowDto);
      const normalizedTarget = this.workflowNormalizer.normalizeWorkflow(targetWorkflowDto);

      // Separate steps from workflow fields
      const { steps: sourceSteps, ...sourceWithoutSteps } = normalizedSource;
      const { steps: targetSteps, ...targetWithoutSteps } = normalizedTarget;

      // Compare workflow-level fields (excluding steps)
      const workflowDifferences = diff(targetWithoutSteps, sourceWithoutSteps);

      let workflowChanges: {
        previous: Record<string, any> | null;
        new: Record<string, any> | null;
      } | null = null;

      if (Object.keys(workflowDifferences).length > 0) {
        workflowChanges = {
          previous: targetWithoutSteps,
          new: sourceWithoutSteps,
        };
      }

      // Compare steps and generate step-level diffs
      const stepDiffs = this.compareStepsAsEntities(sourceSteps, targetSteps);

      return { workflowChanges, stepDiffs };
    } catch (error) {
      this.logger.error(WORKFLOW_SYNC_MESSAGES.COMPARE_FAILED(error.message));

      return { workflowChanges: null, stepDiffs: [] };
    }
  }

  compareStepsAsEntities(sourceSteps: INormalizedStep[], targetSteps: INormalizedStep[]): IResourceDiff[] {
    const stepDiffs: IResourceDiff[] = [];

    // Create maps for efficient lookup
    const sourceStepMap = new Map(sourceSteps.map((step, index) => [step.stepId, { step, index }]));
    const targetStepMap = new Map(targetSteps.map((step, index) => [step.stepId, { step, index }]));

    const processedSteps = new Set<string>();

    // Process source steps (added/modified/moved)
    sourceSteps.forEach((sourceStep, sourceIndex) => {
      const targetStepData = targetStepMap.get(sourceStep.stepId);

      if (!targetStepData) {
        stepDiffs.push(this.createStepAddedDiff(sourceStep, sourceIndex));
      } else {
        const { step: targetStep, index: targetIndex } = targetStepData;
        const stepChanges = this.compareIndividualStep(sourceStep, targetStep);

        if (stepChanges) {
          stepDiffs.push(this.createStepModifiedDiff(sourceStep, targetStep, sourceIndex, targetIndex, stepChanges));
        } else if (sourceIndex !== targetIndex) {
          stepDiffs.push(this.createStepMovedDiff(sourceStep, targetStep, sourceIndex, targetIndex));
        }
      }

      processedSteps.add(sourceStep.stepId);
    });

    // Process deleted steps
    targetSteps.forEach((targetStep, targetIndex) => {
      if (!processedSteps.has(targetStep.stepId)) {
        stepDiffs.push(this.createStepDeletedDiff(targetStep, targetIndex));
      }
    });

    return stepDiffs;
  }

  private compareIndividualStep(
    sourceStep: INormalizedStep,
    targetStep: INormalizedStep
  ): {
    previous: Record<string, any>;
    new: Record<string, any>;
  } | null {
    // Normalize steps for comparison
    const normalizedSource = this.workflowNormalizer.normalizeStepForComparison(sourceStep);
    const normalizedTarget = this.workflowNormalizer.normalizeStepForComparison(targetStep);

    // Use deep-object-diff for individual step comparison
    const differences = diff(normalizedTarget, normalizedSource);

    if (Object.keys(differences).length === 0) {
      return null;
    }

    return {
      previous: normalizedTarget,
      new: normalizedSource,
    };
  }

  private createStepAddedDiff(sourceStep: INormalizedStep, sourceIndex: number): IResourceDiff {
    const normalizedStep = this.workflowNormalizer.normalizeStepForComparison(sourceStep);

    return {
      sourceResourceId: sourceStep.stepId,
      sourceResourceName: sourceStep.name,
      targetResourceId: null,
      targetResourceName: null,
      resourceType: ResourceTypeEnum.STEP,
      stepType: sourceStep.type,
      action: DiffActionEnum.ADDED,
      newIndex: sourceIndex,
      diffs: {
        previous: null,
        new: normalizedStep,
      },
    };
  }

  private createStepModifiedDiff(
    sourceStep: INormalizedStep,
    targetStep: INormalizedStep,
    sourceIndex: number,
    targetIndex: number,
    stepChanges: {
      previous: Record<string, any>;
      new: Record<string, any>;
    }
  ): IResourceDiff {
    return {
      sourceResourceId: sourceStep.stepId,
      sourceResourceName: sourceStep.name,
      targetResourceId: targetStep.stepId,
      targetResourceName: targetStep.name,
      resourceType: ResourceTypeEnum.STEP,
      stepType: sourceStep.type,
      action: DiffActionEnum.MODIFIED,
      previousIndex: targetIndex,
      newIndex: sourceIndex,
      diffs: stepChanges,
    };
  }

  private createStepMovedDiff(
    sourceStep: INormalizedStep,
    targetStep: INormalizedStep,
    sourceIndex: number,
    targetIndex: number
  ): IResourceDiff {
    return {
      sourceResourceId: sourceStep.stepId,
      sourceResourceName: sourceStep.name,
      targetResourceId: targetStep.stepId,
      targetResourceName: targetStep.name,
      resourceType: ResourceTypeEnum.STEP,
      stepType: sourceStep.type,
      action: DiffActionEnum.MOVED,
      previousIndex: targetIndex,
      newIndex: sourceIndex,
    };
  }

  private createStepDeletedDiff(targetStep: INormalizedStep, targetIndex: number): IResourceDiff {
    const normalizedStep = this.workflowNormalizer.normalizeStepForComparison(targetStep);

    return {
      sourceResourceId: null,
      sourceResourceName: null,
      targetResourceId: targetStep.stepId,
      targetResourceName: targetStep.name,
      resourceType: ResourceTypeEnum.STEP,
      stepType: targetStep.type,
      action: DiffActionEnum.DELETED,
      previousIndex: targetIndex,
      diffs: {
        previous: normalizedStep,
        new: null,
      },
    };
  }
}
