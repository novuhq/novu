import { Injectable } from '@nestjs/common';
import { Instrument, PinoLogger } from '@novu/application-generic';
import { diff } from 'deep-object-diff';
import { UserSessionData } from '@novu/shared';
import { LocalizationResourceEnum, NotificationTemplateEntity } from '@novu/dal';
import { ModuleRef } from '@nestjs/core';
import { GetWorkflowUseCase, GetWorkflowCommand } from '../../../../workflows-v2/usecases/get-workflow';
import { WorkflowNormalizer } from '../normalizers/workflow.normalizer';
import { IWorkflowComparison, INormalizedStep, INormalizedWorkflow } from '../types/workflow-sync.types';
import { IResourceDiff, DiffActionEnum, ResourceTypeEnum } from '../../../types/sync.types';
import { WorkflowRepositoryService } from '../operations/workflow-repository.service';

@Injectable()
export class WorkflowComparator {
  constructor(
    private logger: PinoLogger,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private workflowNormalizer: WorkflowNormalizer,
    private workflowRepositoryService: WorkflowRepositoryService,
    private moduleRef: ModuleRef
  ) {}

  async compareWorkflows(
    sourceWorkflow: NotificationTemplateEntity,
    targetWorkflow: NotificationTemplateEntity,
    userContext: UserSessionData
  ): Promise<IWorkflowComparison> {
    try {
      if (!sourceWorkflow || !targetWorkflow) {
        throw new Error('Source and target workflows must not be null');
      }

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

      const normalizedSource = this.workflowNormalizer.normalizeWorkflow(sourceWorkflowDto);
      const normalizedTarget = this.workflowNormalizer.normalizeWorkflow(targetWorkflowDto);

      // Separate steps from workflow fields
      const { steps: sourceSteps, ...sourceWithoutSteps } = normalizedSource;
      const { steps: targetSteps, ...targetWithoutSteps } = normalizedTarget;

      const workflowDifferences = diff(targetWithoutSteps, sourceWithoutSteps);

      let workflowChanges: {
        previous: Partial<INormalizedWorkflow> | null;
        new: Partial<INormalizedWorkflow> | null;
      } | null = null;

      if (Object.keys(workflowDifferences).length > 0) {
        workflowChanges = {
          previous: targetWithoutSteps,
          new: sourceWithoutSteps,
        };
      }

      // Compare steps and generate step-level diffs
      const stepDiffs = this.compareStepsAsEntities(sourceSteps, targetSteps);

      // Get localization group diffs for this workflow only if translation is enabled
      const localizationDiffs =
        sourceWorkflow.isTranslationEnabled || targetWorkflow.isTranslationEnabled
          ? await this.getLocalizationDiffs(sourceWorkflow, targetWorkflow, userContext._id)
          : [];

      return { workflowChanges, otherDiffs: [...stepDiffs, ...localizationDiffs] };
    } catch (error) {
      this.logger.error({ err: error }, `Failed to compare workflows ${error.message}`);

      return { workflowChanges: null, otherDiffs: [] };
    }
  }

  @Instrument()
  private async getLocalizationDiffs(
    sourceWorkflow: NotificationTemplateEntity,
    targetWorkflow: NotificationTemplateEntity,
    userId: string
  ): Promise<IResourceDiff[]> {
    try {
      // Use the new DiffTranslationGroups use case from the translation module
      // eslint-disable-next-line global-require
      const diffTranslationGroups = this.moduleRef.get(require('@novu/ee-translation')?.DiffTranslationGroups, {
        strict: false,
      });

      if (!diffTranslationGroups) {
        this.logger.debug('Translation module not available, skipping localization diff');

        return [];
      }

      return await diffTranslationGroups.execute({
        sourceEnvironmentId: sourceWorkflow._environmentId,
        targetEnvironmentId: targetWorkflow._environmentId,
        resourceId: this.workflowRepositoryService.getWorkflowIdentifier(sourceWorkflow),
        resourceType: LocalizationResourceEnum.WORKFLOW,
        userId,
        environmentId: sourceWorkflow._environmentId, // Required by EnvironmentWithUserCommand
      });
    } catch (error) {
      this.logger.error(`Failed to diff localization groups for workflow ${sourceWorkflow.name}`, error);

      return [];
    }
  }

  compareStepsAsEntities(sourceSteps: INormalizedStep[], targetSteps: INormalizedStep[]): IResourceDiff[] {
    const stepDiffs: IResourceDiff[] = [];

    const targetStepMap = new Map(targetSteps.map((step, index) => [step.stepId, { step, index }]));

    const processedSteps = new Set<string>();

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
    previous: Partial<INormalizedStep> | null;
    new: Partial<INormalizedStep> | null;
  } | null {
    const differences = diff(targetStep, sourceStep);

    if (Object.keys(differences).length === 0) {
      return null;
    }

    return {
      previous: targetStep,
      new: sourceStep,
    };
  }

  private createStepAddedDiff(sourceStep: INormalizedStep, sourceIndex: number): IResourceDiff {
    return {
      sourceResource: {
        id: sourceStep.stepId,
        name: sourceStep.name,
        updatedBy: null,
        updatedAt: null,
      },
      targetResource: null,
      resourceType: ResourceTypeEnum.STEP,
      stepType: sourceStep.type,
      action: DiffActionEnum.ADDED,
      newIndex: sourceIndex,
      diffs: {
        previous: null,
        new: sourceStep,
      },
    };
  }

  private createStepModifiedDiff(
    sourceStep: INormalizedStep,
    targetStep: INormalizedStep,
    sourceIndex: number,
    targetIndex: number,
    stepChanges: {
      previous: Partial<INormalizedStep> | null;
      new: Partial<INormalizedStep> | null;
    }
  ): IResourceDiff {
    return {
      sourceResource: {
        id: sourceStep.stepId,
        name: sourceStep.name,
        updatedBy: null,
        updatedAt: null,
      },
      targetResource: {
        id: targetStep.stepId,
        name: targetStep.name,
        updatedBy: null,
        updatedAt: null,
      },
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
      sourceResource: {
        id: sourceStep.stepId,
        name: sourceStep.name,
        updatedBy: null,
        updatedAt: null,
      },
      targetResource: {
        id: targetStep.stepId,
        name: targetStep.name,
        updatedBy: null,
        updatedAt: null,
      },
      resourceType: ResourceTypeEnum.STEP,
      stepType: sourceStep.type,
      action: DiffActionEnum.MOVED,
      previousIndex: targetIndex,
      newIndex: sourceIndex,
    };
  }

  private createStepDeletedDiff(targetStep: INormalizedStep, targetIndex: number): IResourceDiff {
    return {
      sourceResource: null,
      targetResource: {
        id: targetStep.stepId,
        name: targetStep.name,
        updatedBy: null,
        updatedAt: null,
      },
      resourceType: ResourceTypeEnum.STEP,
      stepType: targetStep.type,
      action: DiffActionEnum.DELETED,
      previousIndex: targetIndex,
      diffs: {
        previous: targetStep,
        new: null,
      },
    };
  }
}
