import { useMemo } from 'react';
import type { IEnvironmentDiffResponse, IResourceDependency, IResourceDiffResult } from '@/api/environments';
import type { RequiredByResource, ResourceSelectionState } from '@/hooks/use-changes-tree';

type UseResourceDependenciesResult = {
  workflows: IResourceDiffResult[];
  layouts: IResourceDiffResult[];
  agents: IResourceDiffResult[];
  dependencyMap: Map<string, IResourceDependency[]>;
  calculateDependencyState: (selection: ResourceSelectionState) => ResourceSelectionState;
};

function getResourceId(resource: IResourceDiffResult): string | undefined {
  return resource.sourceResource?.id || resource.targetResource?.id || undefined;
}

function resourceName(resource: IResourceDiffResult): string {
  return resource.sourceResource?.name || resource.targetResource?.name || 'Unnamed resource';
}

function findSelectionId(selection: ResourceSelectionState, dependency: IResourceDependency): string | undefined {
  for (const [id, state] of Object.entries(selection)) {
    if (state.resource.resourceType !== dependency.resourceType) continue;

    const actualId = getResourceId(state.resource);
    if (actualId === dependency.resourceId || id === dependency.resourceId) return id;
  }

  return undefined;
}

function lockDependency(
  selection: ResourceSelectionState,
  dependency: IResourceDependency,
  requiredBy: RequiredByResource
) {
  if (!dependency.isBlocking) return;

  const selectionId = findSelectionId(selection, dependency);
  if (!selectionId) return;

  const current = selection[selectionId];
  const alreadyListed = current.requiredBy.some((item) => item.id === requiredBy.id);
  selection[selectionId] = {
    ...current,
    selected: true,
    disabled: true,
    requiredBy: alreadyListed ? current.requiredBy : [...current.requiredBy, requiredBy],
  };
}

/** Forces blocking dependencies selected and records which selected change requires each one. */
export function applyDependencyLocks(
  selection: ResourceSelectionState,
  dependencyMap: Map<string, IResourceDependency[]>
): ResourceSelectionState {
  const updated: ResourceSelectionState = {};

  for (const [id, state] of Object.entries(selection)) {
    updated[id] = { ...state, disabled: false, requiredBy: [] };
  }

  for (const [resourceId, state] of Object.entries(updated)) {
    if (!state.selected) continue;

    const dependencies = state.resource.dependencies ?? dependencyMap.get(resourceId) ?? [];
    const requiredBy = {
      id: resourceId,
      name: resourceName(state.resource),
      resourceType: state.resource.resourceType,
    };

    for (const dependency of dependencies) {
      lockDependency(updated, dependency, requiredBy);
    }
  }

  return updated;
}

export function useResourceDependencies(diffData: IEnvironmentDiffResponse | undefined): UseResourceDependenciesResult {
  const { workflows, layouts, agents, dependencyMap } = useMemo(() => {
    if (!diffData?.resources) {
      return { workflows: [], layouts: [], agents: [], dependencyMap: new Map() };
    }

    const workflowResources = diffData.resources.filter((r: IResourceDiffResult) => r.resourceType === 'workflow');
    const layoutResources = diffData.resources.filter((r: IResourceDiffResult) => r.resourceType === 'layout');
    const agentResources = diffData.resources.filter((r: IResourceDiffResult) => r.resourceType === 'agent');

    const depMap = new Map<string, IResourceDependency[]>();

    for (const resource of diffData.resources) {
      if (!resource.dependencies?.length) {
        continue;
      }

      const resourceId = getResourceId(resource);

      if (resourceId) {
        depMap.set(resourceId, resource.dependencies);
      }
    }

    return {
      workflows: workflowResources,
      layouts: layoutResources,
      agents: agentResources,
      dependencyMap: depMap,
    };
  }, [diffData]);

  const calculateDependencyState = useMemo(() => {
    return (selection: ResourceSelectionState) => applyDependencyLocks(selection, dependencyMap);
  }, [dependencyMap]);

  return {
    workflows,
    layouts,
    agents,
    dependencyMap,
    calculateDependencyState,
  };
}
