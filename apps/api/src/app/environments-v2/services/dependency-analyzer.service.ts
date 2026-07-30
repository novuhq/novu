import { Injectable } from '@nestjs/common';
import { PinoLogger, WorkflowDataContainer, WorkflowResponseDto } from '@novu/application-generic';
import { AgentRepository, ControlValuesRepository, LayoutRepository, NotificationTemplateRepository } from '@novu/dal';
import { ControlValuesLevelEnum, StepTypeEnum } from '@novu/shared';
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
    private agentRepository: AgentRepository,
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

    const layoutResourceByIdMap = new Map<string, IDiffResult>();
    const agentResourceByIdMap = new Map<string, IDiffResult>();

    resources.forEach((resource) => {
      if (resource.resourceType === ResourceTypeEnum.LAYOUT) {
        if (resource.sourceResource?.id) {
          layoutResourceByIdMap.set(resource.sourceResource.id, resource);
        }
        if (resource.targetResource?.id && !resource.sourceResource) {
          layoutResourceByIdMap.set(resource.targetResource.id, resource);
        }
      }

      if (resource.resourceType === ResourceTypeEnum.AGENT) {
        if (resource.sourceResource?.id) {
          agentResourceByIdMap.set(resource.sourceResource.id, resource);
        }
        if (resource.targetResource?.id && !resource.sourceResource) {
          agentResourceByIdMap.set(resource.targetResource.id, resource);
        }
      }
    });

    this.logger.debug(`Found ${layoutResourceByIdMap.size} layouts by ID`);
    this.logger.debug(`Found ${agentResourceByIdMap.size} agents by ID`);

    const workflowResources = resources.filter(
      (resource) => resource.resourceType === ResourceTypeEnum.WORKFLOW && resource.sourceResource?.id
    );

    if (workflowResources.length > 0) {
      for (const resource of workflowResources) {
        this.logger.debug(
          `Analyzing dependencies for workflow: ${resource.sourceResource!.name} (${resource.sourceResource!.id})`
        );

        const workflowDto = workflowDataContainer.getWorkflowDto(resource.sourceResource?.id!, sourceEnvId);

        const dependencies = await this.getWorkflowDependencies(
          resource,
          layoutResourceByIdMap,
          agentResourceByIdMap,
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

      if (resource.resourceType === ResourceTypeEnum.AGENT && resource.targetResource?.id && !resource.sourceResource) {
        this.logger.debug(
          `Analyzing reverse dependencies for deleted agent: ${resource.targetResource.name} (${resource.targetResource.id})`
        );

        const reverseDependencies = await this.getAgentReverseDependencies(resource, targetEnvId, organizationId);

        if (reverseDependencies.length > 0) {
          this.logger.debug(
            `Found ${reverseDependencies.length} reverse dependencies for agent ${resource.targetResource.name}`
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
    agentResourceByIdMap: Map<string, IDiffResult>,
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

      if (workflowDto?.steps) {
        for (const step of workflowDto.steps) {
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

      const agentIdentifier = workflowDto?.agent?.identifier;
      if (agentIdentifier) {
        const agentDependency = await this.createAgentDependency(
          agentIdentifier,
          agentResourceByIdMap,
          targetEnvId,
          organizationId
        );

        if (agentDependency) {
          this.logger.debug(
            `Created dependency: workflow -> agent ${agentDependency.resourceName} (blocking: ${agentDependency.isBlocking})`
          );
          dependencies.push(agentDependency);
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

      const controlValues = await this.controlValuesRepository.find({
        _environmentId: targetEnvId,
        _organizationId: organizationId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        'controls.layoutId': layoutId,
      });

      this.logger.debug(
        `Found ${controlValues.length} control values using deleted layout ${layoutId} in target environment`
      );

      const processedWorkflowIds = new Set<string>();

      for (const controlValue of controlValues) {
        const workflowId = controlValue._workflowId;
        if (!workflowId || processedWorkflowIds.has(workflowId)) continue;
        processedWorkflowIds.add(workflowId);

        const workflow = await this.workflowRepository.findOne({
          _environmentId: targetEnvId,
          _organizationId: organizationId,
          _id: workflowId,
        });

        if (!workflow) {
          this.logger.warn(`Workflow ${workflowId} not found in target environment`);
          continue;
        }

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

  async getAgentReverseDependencies(
    deletedAgentDiff: IDiffResult,
    targetEnvId: string,
    organizationId: string
  ): Promise<IResourceDependency[]> {
    const reverseDependencies: IResourceDependency[] = [];

    try {
      if (!deletedAgentDiff.targetResource?.id) {
        return reverseDependencies;
      }

      const agentIdentifier = deletedAgentDiff.targetResource.id;
      this.logger.debug(
        `Checking if deleted agent ${agentIdentifier} is still used by workflows in target environment`
      );

      const workflows = await this.workflowRepository.find(
        {
          _environmentId: targetEnvId,
          _organizationId: organizationId,
          'agent.identifier': agentIdentifier,
        },
        { name: 1, 'triggers.identifier': 1 }
      );

      this.logger.debug(
        `Found ${workflows.length} workflows using deleted agent ${agentIdentifier} in target environment`
      );

      for (const workflow of workflows) {
        const dependency: IResourceDependency = {
          resourceType: ResourceTypeEnum.WORKFLOW,
          resourceId: workflow.triggers?.[0]?.identifier!,
          resourceName: workflow.name,
          // Non-blocking: deleting an agent clears workflow.agent assignments.
          isBlocking: false,
          reason: DependencyReasonEnum.AGENT_REQUIRED_FOR_WORKFLOW,
        };

        this.logger.debug(
          `Created non-blocking dependency: agent ${agentIdentifier} -> workflow ${workflow.triggers?.[0]?.identifier} (agent delete clears assignment)`
        );
        reverseDependencies.push(dependency);
      }
    } catch (error) {
      this.logger.error(
        `Failed to analyze reverse dependencies for deleted agent ${deletedAgentDiff.targetResource?.name || 'unknown'}`,
        error
      );
    }

    return reverseDependencies;
  }

  extractLayoutIdsFromStepChange(stepChange: IResourceDiff): string[] {
    const layoutIds: string[] = [];

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

  async createAgentDependency(
    agentIdentifier: string,
    agentResourceByIdMap: Map<string, IDiffResult>,
    targetEnvId: string,
    organizationId: string
  ): Promise<IResourceDependency | null> {
    this.logger.debug(`Creating agent dependency for agentIdentifier: ${agentIdentifier}`);

    const agentDiff = agentResourceByIdMap.get(agentIdentifier);

    if (agentDiff?.summary?.deleted && agentDiff.summary.deleted > 0) {
      this.logger.debug(`Agent ${agentIdentifier} is being deleted - not creating dependency for workflow`);

      return null;
    }

    const targetAgent = await this.agentRepository.findOne(
      {
        _environmentId: targetEnvId,
        _organizationId: organizationId,
        identifier: agentIdentifier,
      },
      ['name']
    );

    this.logger.debug(`Agent ${agentIdentifier} exists in target environment: ${!!targetAgent}`);

    this.logger.debug(
      `Agent ${agentIdentifier} found in diff results: ${!!agentDiff} (added: ${agentDiff?.summary?.added || 0})`
    );

    const isBlocking = this.isDependencyBlocking(targetAgent, agentDiff);
    const reason = isBlocking
      ? DependencyReasonEnum.AGENT_REQUIRED_FOR_WORKFLOW
      : DependencyReasonEnum.AGENT_EXISTS_IN_TARGET;

    this.logger.debug(
      `Agent dependency ${agentIdentifier} is ${isBlocking ? 'blocking' : 'non-blocking'} (reason: ${reason})`
    );

    return {
      resourceType: ResourceTypeEnum.AGENT,
      resourceId: agentIdentifier,
      resourceName: agentDiff?.sourceResource?.name || targetAgent?.name || agentIdentifier,
      isBlocking,
      reason,
    };
  }

  isDependencyBlocking(targetResource: unknown, resourceDiff?: IDiffResult): boolean {
    if (!targetResource && resourceDiff?.summary?.added && resourceDiff.summary.added > 0) {
      this.logger.debug("Dependency is blocking: resource doesn't exist in target but is being added");

      return true;
    }

    if (resourceDiff?.summary?.deleted && resourceDiff.summary.deleted > 0) {
      this.logger.debug('Resource is being deleted, but workflow can function without it - not blocking');

      return false;
    }

    if (!targetResource && !resourceDiff) {
      this.logger.debug("Dependency is blocking: resource doesn't exist in target and not in diff");

      return true;
    }

    this.logger.debug('Dependency is not blocking');

    return false;
  }
}
