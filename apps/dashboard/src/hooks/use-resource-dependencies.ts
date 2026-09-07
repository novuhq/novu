import { useMemo } from 'react';
import type { IEnvironmentDiffResponse, IResourceDependency, IResourceDiffResult } from '@/api/environments';

type ResourceSelection = {
  [resourceId: string]: {
    selected: boolean;
    disabled: boolean;
    resource: IResourceDiffResult;
  };
};

type UseResourceDependenciesResult = {
  workflows: IResourceDiffResult[];
  layouts: IResourceDiffResult[];
  agents: IResourceDiffResult[];
  dependencyMap: Map<string, IResourceDependency[]>;
  calculateDependencyState: (selection: ResourceSelection) => ResourceSelection;
};

function getResourceId(resource: IResourceDiffResult): string | undefined {
  return resource.sourceResource?.id || resource.targetResource?.id || undefined;
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
    return (selection: ResourceSelection): ResourceSelection => {
      const updated: ResourceSelection = {};

      for (const [id, resourceState] of Object.entries(selection)) {
        updated[id] = { ...resourceState, disabled: false };
      }

      for (const [resourceId, resourceState] of Object.entries(updated)) {
        if (!resourceState.selected) {
          continue;
        }

        const dependencies = resourceState.resource.dependencies ?? dependencyMap.get(resourceId);

        if (!dependencies?.length) {
          continue;
        }

        for (const dep of dependencies) {
          // Only deps missing from the target must publish with the selected parent.
          if (!dep.isBlocking) {
            continue;
          }

          for (const [depSelectionId, depResourceState] of Object.entries(updated)) {
            if (depResourceState.resource.resourceType !== dep.resourceType) {
              continue;
            }

            const depResourceActualId = getResourceId(depResourceState.resource);

            if (depResourceActualId === dep.resourceId || depSelectionId === dep.resourceId) {
              updated[depSelectionId] = {
                ...updated[depSelectionId],
                selected: true,
                disabled: true,
              };
            }
          }
        }
      }

      return updated;
    };
  }, [dependencyMap]);

  return {
    workflows,
    layouts,
    agents,
    dependencyMap,
    calculateDependencyState,
  };
}
