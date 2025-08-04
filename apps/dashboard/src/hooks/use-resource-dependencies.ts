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
  dependencyMap: Map<string, IResourceDependency[]>;
  calculateDependencyState: (selection: ResourceSelection) => ResourceSelection;
};

export function useResourceDependencies(diffData: IEnvironmentDiffResponse | undefined): UseResourceDependenciesResult {
  const { workflows, layouts, dependencyMap } = useMemo(() => {
    if (!diffData?.resources) {
      return { workflows: [], layouts: [], dependencyMap: new Map() };
    }

    const workflowResources = diffData.resources.filter((r: IResourceDiffResult) => r.resourceType === 'workflow');
    const layoutResources = diffData.resources.filter((r: IResourceDiffResult) => r.resourceType === 'layout');

    // Build dependency map for quick lookup (include both workflows and layouts)
    const depMap = new Map<string, IResourceDependency[]>();

    // Add workflow dependencies
    workflowResources.forEach((workflow: IResourceDiffResult) => {
      if (workflow.dependencies?.length) {
        const workflowId = workflow.sourceResource?.id || workflow.targetResource?.id;

        if (workflowId) {
          depMap.set(workflowId, workflow.dependencies);
        }
      }
    });

    // Add layout dependencies to the map as well
    layoutResources.forEach((layout: IResourceDiffResult) => {
      if (layout.dependencies?.length) {
        const layoutId = layout.sourceResource?.id || layout.targetResource?.id;

        if (layoutId) {
          depMap.set(layoutId, layout.dependencies);
        }
      }
    });

    return {
      workflows: workflowResources,
      layouts: layoutResources,
      dependencyMap: depMap,
    };
  }, [diffData]);

  // Function to calculate dependency state
  const calculateDependencyState = useMemo(() => {
    return (selection: ResourceSelection): ResourceSelection => {
      const updated = { ...selection };

      // Reset all disabled states
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], disabled: false };
      });

      // Check dependencies for all selected resources (both workflows and layouts)
      Object.entries(updated).forEach(([resourceId, resourceState]) => {
        if (resourceState.selected) {
          // Get dependencies from the resource itself
          const resourceDependencies = resourceState.resource.dependencies;

          if (resourceDependencies && resourceDependencies.length > 0) {
            resourceDependencies.forEach((dep: IResourceDependency) => {
              if (dep.isBlocking) {
                // Find the dependent resource by ID and mark it as selected and disabled
                Object.entries(updated).forEach(([depResourceId, depResourceState]) => {
                  const depResource = depResourceState.resource;
                  const depResourceActualId = depResource.sourceResource?.id || depResource.targetResource?.id;

                  if (depResourceActualId === dep.resourceId) {
                    updated[depResourceId] = {
                      ...updated[depResourceId],
                      selected: true,
                      disabled: true,
                    };
                  }
                });
              }
            });
          }

          // Also check if this is a workflow with dependencies (original logic)
          if (resourceState.resource.resourceType === 'workflow') {
            const dependencies = dependencyMap.get(resourceId);

            if (dependencies) {
              dependencies.forEach((dep: IResourceDependency) => {
                // Find the dependent layout and mark as disabled if blocking
                Object.entries(updated).forEach(([layoutId, layoutState]) => {
                  if (layoutState.resource.resourceType === 'layout' && dep.isBlocking) {
                    const layoutResource = layoutState.resource;
                    const layoutResourceId = layoutResource.sourceResource?.id || layoutResource.targetResource?.id;

                    const matchesById = layoutResourceId === dep.resourceId;

                    if (matchesById) {
                      updated[layoutId] = {
                        ...updated[layoutId],
                        selected: true,
                        disabled: true,
                      };
                    }
                  }
                });
              });
            }
          }
        }
      });

      return updated;
    };
  }, [dependencyMap]);

  return {
    workflows,
    layouts,
    dependencyMap,
    calculateDependencyState,
  };
}
