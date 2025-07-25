import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository } from '@novu/dal';
import { ControlValuesLevelEnum, StepTypeEnum } from '@novu/shared';
import {
  IDiffResult,
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
    private layoutRepository: LayoutRepository
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
      }
    });

    this.logger.debug(
      `Found ${layoutResourceByIdMap.size} layouts by ID and ${layoutResourceByNameMap.size} layouts by name`
    );

    // Analyze each workflow for layout dependencies
    for (const resource of resources) {
      if (resource.resourceType === ResourceTypeEnum.WORKFLOW && resource.sourceResource?.id) {
        this.logger.debug(
          `Analyzing dependencies for workflow: ${resource.sourceResource.name} (${resource.sourceResource.id})`
        );

        const dependencies = await this.getWorkflowDependencies(
          resource,
          layoutResourceByIdMap,
          layoutResourceByNameMap,
          sourceEnvId,
          targetEnvId,
          organizationId
        );

        if (dependencies.length > 0) {
          this.logger.debug(`Found ${dependencies.length} dependencies for workflow ${resource.sourceResource.name}`);
          dependencyMap.set(resource.sourceResource.id, dependencies);
        }
      }
    }

    return dependencyMap;
  }

  private async getWorkflowDependencies(
    workflowDiff: IDiffResult,
    layoutResourceByIdMap: Map<string, IDiffResult>,
    layoutResourceByNameMap: Map<string, IDiffResult>,
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string
  ): Promise<IResourceDependency[]> {
    const dependencies: IResourceDependency[] = [];
    const processedLayoutIds = new Set<string>();

    try {
      if (workflowDiff.changes) {
        this.logger.debug(`Analyzing ${workflowDiff.changes.length} changes in workflow`);

        for (const change of workflowDiff.changes) {
          // Handle both enum and string values for resourceType
          const isStepChange = change.resourceType === ResourceTypeEnum.STEP || (change.resourceType as any) === 'step';
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

      const controlValues = await this.controlValuesRepository.find({
        _environmentId: sourceEnvId,
        _organizationId: organizationId,
        _workflowId: workflowDiff.sourceResource?.id,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        'controls.layoutId': { $exists: true, $ne: null },
      });

      this.logger.debug(`Found ${controlValues.length} control values with layoutId references`);

      for (const controlValue of controlValues) {
        const layoutId = controlValue.controls?.layoutId as string;
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

  private extractLayoutIdsFromStepChange(stepChange: any): string[] {
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

  private async createLayoutDependency(
    layoutId: string,
    layoutResourceByIdMap: Map<string, IDiffResult>,
    layoutResourceByNameMap: Map<string, IDiffResult>,
    targetEnvId: string,
    organizationId: string
  ): Promise<IResourceDependency | null> {
    this.logger.debug(`Creating layout dependency for layoutId: ${layoutId}`);

    const targetLayout = await this.layoutRepository.findOne({
      _environmentId: targetEnvId,
      _organizationId: organizationId,
      layoutId,
    });

    this.logger.debug(`Layout ${layoutId} exists in target environment: ${!!targetLayout}`);

    const layoutDiff = layoutResourceByIdMap.get(layoutId);

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

  private isDependencyBlocking(targetLayout: any, layoutDiff?: IDiffResult): boolean {
    // If layout doesn't exist in target and there's a new layout being added, it's blocking
    if (!targetLayout && layoutDiff?.summary?.added && layoutDiff.summary.added > 0) {
      this.logger.debug("Dependency is blocking: layout doesn't exist in target but is being added");

      return true;
    }

    // If layout is being deleted in the diff, it's blocking
    if (layoutDiff?.summary?.deleted && layoutDiff.summary.deleted > 0) {
      this.logger.debug('Dependency is blocking: layout is being deleted');

      return true;
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
