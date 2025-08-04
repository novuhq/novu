import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository, NotificationTemplateRepository } from '@novu/dal';
import { ControlValuesLevelEnum, StepTypeEnum } from '@novu/shared';
import { WorkflowDataContainer } from '../../shared/containers/workflow-data.container';
import { WorkflowResponseDto } from '../../workflows-v2/dtos/workflow-response.dto';
import {
  DependencyReasonEnum,
  IDiffResult,
  IResourceDependency,
  IResourceDiff,
  ResourceTypeEnum,
} from '../types/sync.types';

@Injectable()
export class DependencyAnalyzerService {
  constructor(
    private logger: PinoLogger,
    private controlValuesRepository: ControlValuesRepository,
    private layoutRepository: LayoutRepository,
    private workflowRepository: NotificationTemplateRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async analyzeDependencies(
    resources: IDiffResult[],
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    workflowDataContainer?: WorkflowDataContainer
  ): Promise<Map<string, IResourceDependency[]>> {
    if (!workflowDataContainer) {
      throw new Error('WorkflowDataContainer is required for dependency analysis');
    }
    const dependencyMap = new Map<string, IResourceDependency[]>();

    // Create map of layout resources for quick lookup by ID
    const layoutResourceByIdMap = new Map<string, IDiffResult>();

    resources.forEach((resource) => {
      if (resource.resourceType === ResourceTypeEnum.LAYOUT) {
        if (resource.sourceResource?.id) {
          layoutResourceByIdMap.set(resource.sourceResource.id, resource);
        }
        // Handle deleted layouts (targetResource exists but sourceResource is null)
        if (resource.targetResource?.id && !resource.sourceResource) {
          layoutResourceByIdMap.set(resource.targetResource.id, resource);
        }
      }
    });

    this.logger.debug(`Found ${layoutResourceByIdMap.size} layouts by ID`);

    // Get all workflow resources for batched processing
    const workflowResources = resources.filter(
      (resource) => resource.resourceType === ResourceTypeEnum.WORKFLOW && resource.sourceResource?.id
    );

    if (workflowResources.length > 0) {
      // Use pre-loaded workflow data from container
      for (const resource of workflowResources) {
        this.logger.debug(
          `Analyzing dependencies for workflow: ${resource.sourceResource!.name} (${resource.sourceResource!.id})`
        );

        const workflowDto = workflowDataContainer.getWorkflowDto(resource.sourceResource?.id!, sourceEnvId);

        const dependencies = await this.getWorkflowDependencies(
          resource,
          layoutResourceByIdMap,
          targetEnvId,
          organizationId,
          workflowDto
        );

        if (dependencies.length > 0) {
          this.logger.debug(`Found ${dependencies.length} dependencies for workflow ${resource.sourceResource!.name}`);
          dependencyMap.set(resource.sourceResource?.id!, dependencies);
        }
      }
    }

    // Analyze reverse dependencies: layouts that are being deleted but are still used by workflows in target
    for (const resource of resources) {
      if (
        resource.resourceType === ResourceTypeEnum.LAYOUT &&
        resource.targetResource?.id &&
        !resource.sourceResource
      ) {
        this.logger.debug(
          `Analyzing reverse dependencies for deleted layout: ${resource.targetResource.name} (${resource.targetResource.id})`
        );

        const reverseDependencies = await this.getLayoutReverseDependencies(resource, targetEnvId, organizationId);

        if (reverseDependencies.length > 0) {
          this.logger.debug(
            `Found ${reverseDependencies.length} reverse dependencies for layout ${resource.targetResource.name}`
          );
          dependencyMap.set(resource.targetResource.id, reverseDependencies);
        }
      }
    }

    return dependencyMap;
  }

  async getWorkflowDependencies(
    workflowDiff: IDiffResult,
    layoutResourceByIdMap: Map<string, IDiffResult>,
    targetEnvId: string,
    organizationId: string,
    workflowDto?: WorkflowResponseDto
  ): Promise<IResourceDependency[]> {
    const dependencies: IResourceDependency[] = [];
    const processedLayoutIds = new Set<string>();

    try {
      if (workflowDiff.changes) {
        this.logger.debug(`Analyzing ${workflowDiff.changes.length} changes in workflow`);

        for (const change of workflowDiff.changes) {
          const isStepChange = change.resourceType === ResourceTypeEnum.STEP;
          const isEmailStep = change.stepType === StepTypeEnum.EMAIL;

          if (isStepChange && isEmailStep) {
            const layoutIds = this.extractLayoutIdsFromStepChange(change);

            for (const layoutId of layoutIds) {
              if (processedLayoutIds.has(layoutId)) continue;
              processedLayoutIds.add(layoutId);

              const dependency = await this.createLayoutDependency(
                layoutId,
                layoutResourceByIdMap,
                targetEnvId,
                organizationId
              );

              if (dependency) {
                this.logger.debug(
                  `Created dependency: workflow -> layout ${dependency.resourceName} (blocking: ${dependency.isBlocking})`
                );
                dependencies.push(dependency);
              }
            }
          }
        }
      }

      // Extract layout dependencies from workflow DTO steps
      if (workflowDto?.steps) {
        for (const step of workflowDto.steps) {
          // Check for layout ID in control values
          const controlValues = step.controlValues as Record<string, unknown> | undefined;
          const controlsValues = (step.controls as { values?: Record<string, unknown> })?.values;
          const layoutId = controlValues?.layoutId || controlsValues?.layoutId;

          if (!layoutId || typeof layoutId !== 'string' || processedLayoutIds.has(layoutId)) continue;
          processedLayoutIds.add(layoutId);

          const dependency = await this.createLayoutDependency(
            layoutId as string,
            layoutResourceByIdMap,
            targetEnvId,
            organizationId
          );

          if (dependency) {
            this.logger.debug(
              `Created dependency from step ${step.name}: workflow -> layout ${dependency.resourceName} (blocking: ${dependency.isBlocking})`
            );
            dependencies.push(dependency);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to analyze dependencies for workflow ${workflowDiff.sourceResource?.name || 'unknown'}`,
        error
      );
    }

    return dependencies;
  }

  async getLayoutReverseDependencies(
    deletedLayoutDiff: IDiffResult,
    targetEnvId: string,
    organizationId: string
  ): Promise<IResourceDependency[]> {
    const reverseDependencies: IResourceDependency[] = [];

    try {
      if (!deletedLayoutDiff.targetResource?.id) {
        return reverseDependencies;
      }

      const layoutId = deletedLayoutDiff.targetResource.id;
      this.logger.debug(`Checking if deleted layout ${layoutId} is still used by workflows in target environment`);

      // Find workflows in target environment that use this layout
      const controlValues = await this.controlValuesRepository.find({
        _environmentId: targetEnvId,
        _organizationId: organizationId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        'controls.layoutId': layoutId,
      });

      this.logger.debug(
        `Found ${controlValues.length} control values using deleted layout ${layoutId} in target environment`
      );

      // Create blocking dependencies for each workflow using this layout
      const processedWorkflowIds = new Set<string>();

      for (const controlValue of controlValues) {
        const workflowId = controlValue._workflowId;
        if (!workflowId || processedWorkflowIds.has(workflowId)) continue;
        processedWorkflowIds.add(workflowId);

        // Fetch the actual workflow to get its name
        const workflow = await this.workflowRepository.findOne({
          _environmentId: targetEnvId,
          _organizationId: organizationId,
          _id: workflowId,
        });

        if (!workflow) {
          this.logger.warn(`Workflow ${workflowId} not found in target environment`);
          continue;
        }

        // Create a dependency showing this layout cannot be deleted because it's used by a workflow in target
        const dependency: IResourceDependency = {
          resourceType: ResourceTypeEnum.WORKFLOW,
          resourceId: workflow.triggers?.[0]?.identifier!,
          resourceName: workflow.name,
          isBlocking: true,
          reason: DependencyReasonEnum.LAYOUT_REQUIRED_FOR_WORKFLOW,
        };

        this.logger.debug(
          `Created blocking dependency: layout ${layoutId} -> workflow ${workflowId} (layout cannot be deleted)`
        );
        reverseDependencies.push(dependency);
      }
    } catch (error) {
      this.logger.error(
        `Failed to analyze reverse dependencies for deleted layout ${deletedLayoutDiff.targetResource?.name || 'unknown'}`,
        error
      );
    }

    return reverseDependencies;
  }

  extractLayoutIdsFromStepChange(stepChange: IResourceDiff): string[] {
    const layoutIds: string[] = [];

    // Check current/new layout ID - this is what the workflow actually depends on
    const newLayoutId = stepChange.diffs?.new?.controlValues?.layoutId;

    if (newLayoutId && typeof newLayoutId === 'string') {
      layoutIds.push(newLayoutId);
    }

    /*
     * Note: We intentionally don't include the previous layout ID as a dependency
     * because the workflow is moving away from it and no longer needs it
     */

    return layoutIds;
  }

  async createLayoutDependency(
    layoutId: string,
    layoutResourceByIdMap: Map<string, IDiffResult>,
    targetEnvId: string,
    organizationId: string
  ): Promise<IResourceDependency | null> {
    this.logger.debug(`Creating layout dependency for layoutId: ${layoutId}`);

    const layoutDiff = layoutResourceByIdMap.get(layoutId);

    /*
     * If the layout is being deleted (exists in target but not in source),
     * don't create a dependency for the workflow
     */
    if (layoutDiff?.summary?.deleted && layoutDiff.summary.deleted > 0) {
      this.logger.debug(`Layout ${layoutId} is being deleted - not creating dependency for workflow`);

      return null;
    }

    const targetLayout = await this.layoutRepository.findOne({
      _environmentId: targetEnvId,
      _organizationId: organizationId,
      layoutId,
    });

    this.logger.debug(`Layout ${layoutId} exists in target environment: ${!!targetLayout}`);

    this.logger.debug(
      `Layout ${layoutId} found in diff results: ${!!layoutDiff} (added: ${layoutDiff?.summary?.added || 0})`
    );

    const isBlocking = this.isDependencyBlocking(targetLayout, layoutDiff);
    const reason = isBlocking
      ? DependencyReasonEnum.LAYOUT_REQUIRED_FOR_WORKFLOW
      : DependencyReasonEnum.LAYOUT_EXISTS_IN_TARGET;

    this.logger.debug(
      `Layout dependency ${layoutId} is ${isBlocking ? 'blocking' : 'non-blocking'} (reason: ${reason})`
    );

    return {
      resourceType: ResourceTypeEnum.LAYOUT,
      resourceId: layoutId,
      resourceName: layoutDiff?.sourceResource?.name || layoutId || '',
      isBlocking,
      reason,
    };
  }

  isDependencyBlocking(targetLayout: unknown, layoutDiff?: IDiffResult): boolean {
    // If layout doesn't exist in target and there's a new layout being added, it's blocking
    if (!targetLayout && layoutDiff?.summary?.added && layoutDiff.summary.added > 0) {
      this.logger.debug("Dependency is blocking: layout doesn't exist in target but is being added");

      return true;
    }

    /*
     * If layout is being deleted in the diff, it's NOT blocking for workflows
     * Workflows can function without a specific layout (they can use another layout or null)
     */
    if (layoutDiff?.summary?.deleted && layoutDiff.summary.deleted > 0) {
      this.logger.debug('Layout is being deleted, but workflow can function without it - not blocking');

      return false;
    }

    // If layout doesn't exist in target at all (and not in diff), it's blocking
    if (!targetLayout && !layoutDiff) {
      this.logger.debug("Dependency is blocking: layout doesn't exist in target and not in diff");

      return true;
    }

    this.logger.debug('Dependency is not blocking');

    return false;
  }
}
