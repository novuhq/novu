import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository, NotificationTemplateRepository } from '@novu/dal';
import { ControlValuesLevelEnum, StepTypeEnum } from '@novu/shared';
import {
  IDiffResult,
  IResourceDiff,
  IResourceDependency,
  ResourceTypeEnum,
  DiffActionEnum,
  DependencyReasonEnum,
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
    organizationId: string
  ): Promise<Map<string, IResourceDependency[]>> {
    const dependencyMap = new Map<string, IResourceDependency[]>();

    // Create maps of layout resources for quick lookup by both ID and name
    const layoutResourceByIdMap = new Map<string, IDiffResult>();
    const layoutResourceByNameMap = new Map<string, IDiffResult>();

    resources.forEach((resource) => {
      if (resource.resourceType === ResourceTypeEnum.LAYOUT) {
        if (resource.sourceResource?.id) {
          layoutResourceByIdMap.set(resource.sourceResource.id, resource);
        }
        if (resource.sourceResource?.name) {
          layoutResourceByNameMap.set(resource.sourceResource.name, resource);
        }
        // Handle deleted layouts (targetResource exists but sourceResource is null)
        if (resource.targetResource?.id && !resource.sourceResource) {
          layoutResourceByIdMap.set(resource.targetResource.id, resource);
        }
        if (resource.targetResource?.name && !resource.sourceResource) {
          layoutResourceByNameMap.set(resource.targetResource.name, resource);
        }
      }
    });

    this.logger.debug(
      `Found ${layoutResourceByIdMap.size} layouts by ID and ${layoutResourceByNameMap.size} layouts by name`
    );

    // Get all workflow resources for batched processing
    const workflowResources = resources.filter(
      (resource) => resource.resourceType === ResourceTypeEnum.WORKFLOW && resource.sourceResource?.id
    );

    if (workflowResources.length > 0) {
      // Batch query for all workflow control values
      const workflowIds = workflowResources
        .map((resource) => resource.sourceResource?.id)
        .filter((id): id is string => id !== null && id !== undefined);
      const allControlValues = await this.getControlValuesForWorkflows(workflowIds, sourceEnvId, organizationId);

      // Create a map for quick lookup
      const controlValuesByWorkflowId = new Map<string, unknown[]>();
      allControlValues.forEach((cv) => {
        const workflowId = (cv as any)._workflowId;
        if (!controlValuesByWorkflowId.has(workflowId)) {
          controlValuesByWorkflowId.set(workflowId, []);
        }
        controlValuesByWorkflowId.get(workflowId)!.push(cv);
      });

      // Analyze each workflow for layout dependencies
      for (const resource of workflowResources) {
        this.logger.debug(
          `Analyzing dependencies for workflow: ${resource.sourceResource!.name} (${resource.sourceResource!.id})`
        );

        const dependencies = await this.getWorkflowDependencies(
          resource,
          layoutResourceByIdMap,
          layoutResourceByNameMap,
          sourceEnvId,
          targetEnvId,
          organizationId,
          controlValuesByWorkflowId.get(resource.sourceResource!.id) || []
        );

        if (dependencies.length > 0) {
          this.logger.debug(`Found ${dependencies.length} dependencies for workflow ${resource.sourceResource!.name}`);
          dependencyMap.set(resource.sourceResource!.id, dependencies);
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

  private async getControlValuesForWorkflows(
    workflowIds: string[],
    sourceEnvId: string,
    organizationId: string
  ): Promise<unknown[]> {
    return this.controlValuesRepository.find({
      _environmentId: sourceEnvId,
      _organizationId: organizationId,
      _workflowId: { $in: workflowIds },
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      'controls.layoutId': { $exists: true, $ne: null },
    });
  }

  private async getWorkflowDependencies(
    workflowDiff: IDiffResult,
    layoutResourceByIdMap: Map<string, IDiffResult>,
    layoutResourceByNameMap: Map<string, IDiffResult>,
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    preloadedControlValues: unknown[] = []
  ): Promise<IResourceDependency[]> {
    const dependencies: IResourceDependency[] = [];
    const processedLayoutIds = new Set<string>();

    try {
      if (workflowDiff.changes) {
        this.logger.debug(`Analyzing ${workflowDiff.changes.length} changes in workflow`);

        for (const change of workflowDiff.changes) {
          // Handle both enum and string values for resourceType
          const isStepChange = change.resourceType === ResourceTypeEnum.STEP;
          const isEmailStep = change.stepType === 'email';

          if (isStepChange && isEmailStep) {
            this.logger.debug(`Found email step change: ${change.sourceResource?.name || change.targetResource?.name}`);

            const layoutIds = this.extractLayoutIdsFromStepChange(change);
            this.logger.debug(`Extracted layout IDs: ${layoutIds.join(', ')}`);

            for (const layoutId of layoutIds) {
              if (processedLayoutIds.has(layoutId)) continue;
              processedLayoutIds.add(layoutId);

              const dependency = await this.createLayoutDependency(
                layoutId,
                layoutResourceByIdMap,
                layoutResourceByNameMap,
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

      this.logger.debug(`Found ${preloadedControlValues.length} control values with layoutId references`);

      for (const controlValue of preloadedControlValues) {
        const layoutId = (controlValue as any)?.controls?.layoutId as string;
        if (!layoutId || processedLayoutIds.has(layoutId)) continue;
        processedLayoutIds.add(layoutId);

        const dependency = await this.createLayoutDependency(
          layoutId,
          layoutResourceByIdMap,
          layoutResourceByNameMap,
          targetEnvId,
          organizationId
        );

        if (dependency) {
          this.logger.debug(
            `Created dependency from control values: workflow -> layout ${dependency.resourceName} (blocking: ${dependency.isBlocking})`
          );
          dependencies.push(dependency);
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

  private async getLayoutReverseDependencies(
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

  private extractLayoutIdsFromStepChange(stepChange: IResourceDiff): string[] {
    const layoutIds: string[] = [];

    // Check current/new layout ID
    const newLayoutId = stepChange.diffs?.new?.controlValues?.layoutId;
    if (newLayoutId && typeof newLayoutId === 'string') {
      this.logger.debug(`Found new layoutId in step change: ${newLayoutId}`);
      layoutIds.push(newLayoutId);
    }

    // Check previous layout ID for context (though typically we care about new dependencies)
    const previousLayoutId = stepChange.diffs?.previous?.controlValues?.layoutId;
    if (previousLayoutId && typeof previousLayoutId === 'string' && previousLayoutId !== newLayoutId) {
      this.logger.debug(`Found previous layoutId in step change: ${previousLayoutId}`);
      // Only add if it's different from the new one
      layoutIds.push(previousLayoutId);
    }

    return layoutIds;
  }

  private extractWorkflowIdsFromStepChange(stepChange: IResourceDiff): string[] {
    const workflowIds: string[] = [];

    // Check current/new workflow ID
    const newWorkflowId = stepChange.diffs?.new?.controlValues?.workflowId;
    if (newWorkflowId && typeof newWorkflowId === 'string') {
      this.logger.debug(`Found new workflowId in step change: ${newWorkflowId}`);
      workflowIds.push(newWorkflowId);
    }

    // Check previous workflow ID for context (though typically we care about new dependencies)
    const previousWorkflowId = stepChange.diffs?.previous?.controlValues?.workflowId;
    if (previousWorkflowId && typeof previousWorkflowId === 'string' && previousWorkflowId !== newWorkflowId) {
      this.logger.debug(`Found previous workflowId in step change: ${previousWorkflowId}`);
      // Only add if it's different from the new one
      workflowIds.push(previousWorkflowId);
    }

    return workflowIds;
  }

  private async createLayoutDependency(
    layoutId: string,
    layoutResourceByIdMap: Map<string, IDiffResult>,
    layoutResourceByNameMap: Map<string, IDiffResult>,
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

  private isDependencyBlocking(targetLayout: unknown, layoutDiff?: IDiffResult): boolean {
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
