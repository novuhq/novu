import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { ResourceTypeEnum, IUserInfo, DiffActionEnum, IResourceDiff } from '../../../types/sync.types';
import { BaseDiffOperation } from '../base/operations/base-diff.operation';
import { WorkflowRepositoryAdapter, WorkflowComparatorAdapter } from '../adapters';
import { DiffResultBuilder } from '../builders/diff-result.builder';

@Injectable()
export class WorkflowDiffOperation extends BaseDiffOperation<NotificationTemplateEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: WorkflowRepositoryAdapter,
    protected comparatorAdapter: WorkflowComparatorAdapter
  ) {
    super(logger, repositoryAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.WORKFLOW;
  }

  protected getResourceName(resource: NotificationTemplateEntity): string {
    return resource.name;
  }

  protected extractUpdatedByInfo(resource: NotificationTemplateEntity): IUserInfo | null {
    if (!resource.updatedBy) {
      return null;
    }

    return {
      _id: resource.updatedBy._id,
      firstName: resource.updatedBy.firstName,
      lastName: resource.updatedBy.lastName,
      externalId: resource.updatedBy.externalId,
    };
  }

  protected extractUpdatedAtInfo(resource: NotificationTemplateEntity): string | null {
    if (!resource.updatedAt) {
      return null;
    }

    return resource.updatedAt;
  }

  protected async handleNewResource(
    sourceResource: NotificationTemplateEntity,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData
  ): Promise<void> {
    const resourceInfo = {
      id: this.repositoryAdapter.getResourceIdentifier(sourceResource),
      name: this.getResourceName(sourceResource),
      updatedBy: this.extractUpdatedByInfo(sourceResource),
      updatedAt: this.extractUpdatedAtInfo(sourceResource),
    };

    // For new workflows, we need to extract steps to analyze dependencies
    const stepDiffs = await this.extractStepsFromNewWorkflow(sourceResource, userContext);

    const allDiffs: IResourceDiff[] = [
      {
        sourceResource: resourceInfo,
        targetResource: null,
        resourceType: this.getResourceType(),
        action: DiffActionEnum.ADDED,
      },
    ];

    // Add step diffs so dependency analyzer can find layoutIds in control values
    if (stepDiffs.length > 0) {
      allDiffs.push(...stepDiffs);
    }

    resultBuilder.addResourceDiff(resourceInfo, null, allDiffs);
  }

  private async extractStepsFromNewWorkflow(
    workflow: NotificationTemplateEntity,
    userContext: UserSessionData
  ): Promise<IResourceDiff[]> {
    try {
      /*
       * We need to get the workflow details with steps
       * Use the comparator's internal methods to get normalized workflow data
       */
      const comparator = (this.comparatorAdapter as any).workflowComparator;
      const { getWorkflowUseCase } = comparator;
      const { workflowNormalizer } = comparator;

      // Get the full workflow data
      const workflowDto = await getWorkflowUseCase.execute({
        user: {
          ...userContext,
          environmentId: workflow._environmentId,
        },
        workflowIdOrInternalId: workflow._id,
      });

      // Normalize the workflow to get steps
      const normalizedWorkflow = workflowNormalizer.normalizeWorkflow(workflowDto);

      // Create step diffs for each step as "added"
      return normalizedWorkflow.steps.map((step, index) => ({
        sourceResource: {
          id: step.stepId,
          name: step.name,
          updatedBy: null,
          updatedAt: null,
        },
        targetResource: null,
        resourceType: ResourceTypeEnum.STEP,
        stepType: step.type,
        action: DiffActionEnum.ADDED,
        newIndex: index,
        diffs: {
          previous: null,
          new: step,
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to extract steps from new workflow: ${error.message}`);

      return [];
    }
  }
}
