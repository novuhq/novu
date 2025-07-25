import { useState, useEffect, useMemo } from 'react';
import {
  RiAlertFill,
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiRouteFill,
  RiDashboardLine,
  RiLinkUnlinkM,
  RiInformationLine,
  RiCloseFill,
  RiContractUpDownLine,
  RiExpandUpDownLine,
  RiAddBoxLine,
  RiDeleteBin2Line,
  RiGitCommitFill,
} from 'react-icons/ri';
import { Dialog, DialogContent, DialogClose } from '../primitives/dialog';
import { Button } from '../primitives/button';
import { Badge, BadgeIcon } from '../primitives/badge';
import { Checkbox } from '../primitives/checkbox';
import { Separator } from '../primitives/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../primitives/collapsible';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { formatDateSimple } from '@/utils/format-date';
import type { IEnvironment } from '@novu/shared';
import type { IResourceDiffResult, IResourceDependency } from '@/api/environments';
import type { ResourceToPublish } from '@/api/environments';

type EnhancedPublishModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment;
  currentEnvironmentId?: string;
  onConfirm: (selectedResources: ResourceToPublish[]) => void;
  isPublishing?: boolean;
};

type ResourceSelection = {
  [resourceId: string]: {
    selected: boolean;
    disabled: boolean;
    resource: IResourceDiffResult;
  };
};

export function EnhancedPublishModal({
  isOpen,
  onClose,
  environment,
  currentEnvironmentId,
  onConfirm,
  isPublishing = false,
}: EnhancedPublishModalProps) {
  const [resourceSelection, setResourceSelection] = useState<ResourceSelection>({});
  const [workflowsExpanded, setWorkflowsExpanded] = useState(true);
  const [layoutsExpanded, setLayoutsExpanded] = useState(true);

  const { data: diffData } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment?._id,
    enabled: isOpen,
  });

  const { workflows, layouts, dependencyMap } = useMemo(() => {
    if (!diffData?.resources) {
      return { workflows: [], layouts: [], dependencyMap: new Map() };
    }

    const workflowResources = diffData.resources.filter((r) => r.resourceType === 'workflow');
    const layoutResources = diffData.resources.filter((r) => r.resourceType === 'layout');

    // Build dependency map for quick lookup (include both workflows and layouts)
    const depMap = new Map<string, IResourceDependency[]>();

    // Add workflow dependencies
    workflowResources.forEach((workflow) => {
      if (workflow.dependencies?.length) {
        const workflowId = workflow.sourceResource?.id || workflow.targetResource?.id;

        if (workflowId) {
          depMap.set(workflowId, workflow.dependencies);
        }
      }
    });

    // Add layout dependencies to the map as well
    layoutResources.forEach((layout) => {
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

  // Initialize selection state
  useEffect(() => {
    if (!diffData?.resources) return;

    const initialSelection: ResourceSelection = {};

    diffData.resources.forEach((resource) => {
      const resourceId = resource.sourceResource?.id || resource.targetResource?.id;

      if (resourceId) {
        initialSelection[resourceId] = {
          selected: true, // Start with all selected
          disabled: false,
          resource,
        };
      }
    });

    // Apply dependency rules to the initial selection
    const selectionWithDependencies = calculateDependencyState(initialSelection);
    setResourceSelection(selectionWithDependencies);
  }, [diffData, calculateDependencyState]);

  const handleResourceToggle = (resourceId: string) => {
    setResourceSelection((prev) => {
      const current = prev[resourceId];
      if (current.disabled) return prev;

      const updated = { ...prev };
      updated[resourceId] = { ...current, selected: !current.selected };

      // Recalculate dependency state after the selection change
      return calculateDependencyState(updated);
    });
  };

  const handleGroupToggle = (resourceType: 'workflow' | 'layout') => {
    const resources = resourceType === 'workflow' ? workflows : layouts;
    const allSelected = resources.every((r) => {
      const id = r.sourceResource?.id || r.targetResource?.id;
      return id && resourceSelection[id]?.selected;
    });

    setResourceSelection((prev) => {
      const updated = { ...prev };
      resources.forEach((resource) => {
        const id = resource.sourceResource?.id || resource.targetResource?.id;

        if (id && !updated[id]?.disabled) {
          updated[id] = { ...updated[id], selected: !allSelected };
        }
      });

      // Recalculate dependency state after the group selection change
      return calculateDependencyState(updated);
    });
  };

  const getSelectedCount = (resourceType: 'workflow' | 'layout') => {
    const resources = resourceType === 'workflow' ? workflows : layouts;
    return resources.filter((r) => {
      const id = r.sourceResource?.id || r.targetResource?.id;
      return id && resourceSelection[id]?.selected;
    }).length;
  };

  const getTotalSelectedCount = () => {
    return Object.values(resourceSelection).filter((state) => state.selected).length;
  };

  const handleConfirm = () => {
    const selectedResources: ResourceToPublish[] = Object.entries(resourceSelection)
      .filter(([_, state]) => state.selected)
      .map(([id, state]) => ({
        resourceType: state.resource.resourceType as ResourceToPublish['resourceType'],
        resourceId: id,
      }));
    onConfirm(selectedResources);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg gap-4 p-3">
        <div className="flex items-start justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-orange-50">
            <RiAlertFill className="h-6 w-6 text-orange-500" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-medium text-gray-900">Publishing changes to {environment?.name}</h2>
          <p className="text-xs text-gray-500">
            You're about to publish changes to {environment?.name}. This may cause breaking behavior. Please review all
            changes before proceeding.
          </p>
        </div>

        <div className="space-y-1.5">
          {workflows.length > 0 && (
            <ResourceGroupCompact
              title="Workflows"
              count={workflows.length}
              selectedCount={getSelectedCount('workflow')}
              isExpanded={workflowsExpanded}
              onToggle={() => setWorkflowsExpanded(!workflowsExpanded)}
              onGroupToggle={() => handleGroupToggle('workflow')}
              icon={RiRouteFill}
            >
              {workflows.map((workflow) => {
                const id = workflow.sourceResource?.id || workflow.targetResource?.id;
                if (!id) return null;

                return (
                  <CompactResourceRow
                    key={id}
                    resource={workflow}
                    selected={resourceSelection[id]?.selected || false}
                    disabled={resourceSelection[id]?.disabled || false}
                    onToggle={() => handleResourceToggle(id)}
                    dependencies={dependencyMap.get(id)}
                    allWorkflows={workflows}
                    dependencyMap={dependencyMap}
                  />
                );
              })}
            </ResourceGroupCompact>
          )}

          {layouts.length > 0 && (
            <ResourceGroupCompact
              title="Layouts"
              count={layouts.length}
              selectedCount={getSelectedCount('layout')}
              isExpanded={layoutsExpanded}
              onToggle={() => setLayoutsExpanded(!layoutsExpanded)}
              onGroupToggle={() => handleGroupToggle('layout')}
              icon={RiDashboardLine}
            >
              {layouts.map((layout) => {
                const id = layout.sourceResource?.id || layout.targetResource?.id;
                if (!id) return null;

                return (
                  <CompactResourceRow
                    key={id}
                    resource={layout}
                    selected={resourceSelection[id]?.selected || false}
                    disabled={resourceSelection[id]?.disabled || false}
                    onToggle={() => handleResourceToggle(id)}
                    dependencies={layout.dependencies}
                    allWorkflows={workflows}
                    dependencyMap={dependencyMap}
                  />
                );
              })}
            </ResourceGroupCompact>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" mode="outline" size="2xs" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>

          <Button
            variant="primary"
            mode="gradient"
            size="2xs"
            onClick={handleConfirm}
            disabled={getTotalSelectedCount() === 0 || isPublishing}
            isLoading={isPublishing}
          >
            Publish to {environment?.name} <span className="text-[#E1E4EA]">({getTotalSelectedCount()})</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ResourceGroupProps = {
  title: string;
  count: number;
  selectedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onGroupToggle: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
};

function ResourceGroupCompact({
  title,
  count,
  selectedCount,
  isExpanded,
  onToggle,
  onGroupToggle,
  icon: Icon,
  children,
}: ResourceGroupProps) {
  const allSelected = selectedCount === count;
  const hasPartialSelection = selectedCount > 0 && selectedCount < count;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-1">
      <div className="flex items-center justify-between px-1 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Icon className="h-3.5 w-3.5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">{title}</span>
            <span className="text-xs text-gray-400">
              ({selectedCount}/{count})
            </span>
          </div>
        </div>

        <div className="flex h-[16px] items-center gap-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onGroupToggle}
            {...(hasPartialSelection && { 'data-state': 'indeterminate' })}
          />
          <button onClick={onToggle} className="flex h-4 w-4 items-center justify-center rounded-lg p-0.5">
            {isExpanded ? <RiContractUpDownLine className="h-3 w-3" /> : <RiExpandUpDownLine className="h-3 w-3" />}
          </button>
        </div>
      </div>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          {count > 0 && (
            <div className="rounded-md border border-gray-200 bg-white">
              <div className="divide-y divide-gray-100">{children}</div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

type SelectableResourceRowProps = {
  resource: IResourceDiffResult;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  dependencies?: IResourceDependency[];
  allWorkflows?: IResourceDiffResult[];
  dependencyMap?: Map<string, IResourceDependency[]>;
};

type LayoutUsageIndicatorProps = {
  layoutResource: IResourceDiffResult;
  allWorkflows: IResourceDiffResult[];
  dependencies: Map<string, IResourceDependency[]>;
};

function LayoutUsageIndicator({ layoutResource, allWorkflows, dependencies }: LayoutUsageIndicatorProps) {
  const layoutName = layoutResource.sourceResource?.name || layoutResource.targetResource?.name;
  const layoutId = layoutResource.sourceResource?.id || layoutResource.targetResource?.id;

  // Find workflows that depend on this layout
  const workflowsUsingLayout = useMemo(() => {
    const workflows: Array<{ name: string; slug: string }> = [];

    dependencies.forEach((deps, workflowId) => {
      const workflow = allWorkflows.find(
        (w) => w.sourceResource?.id === workflowId || w.targetResource?.id === workflowId
      );

      if (
        workflow &&
        deps.some((dep) => {
          // Match by resource ID first (most reliable), then by resource name
          return dep.resourceId === layoutId || dep.resourceName === layoutName;
        })
      ) {
        const workflowName = workflow.sourceResource?.name || workflow.targetResource?.name;
        const workflowSlug = workflowName?.toLowerCase().replace(/\s+/g, '-');

        if (workflowName && workflowSlug) {
          workflows.push({ name: workflowName, slug: workflowSlug });
        }
      }
    });

    return workflows;
  }, [layoutName, layoutId, allWorkflows, dependencies]);

  const usageCount = workflowsUsingLayout.length;

  if (usageCount === 0) {
    return (
      <div className="relative flex items-center gap-1 p-0">
        <span className="text-label-2xs text-text-soft">Not used</span>
      </div>
    );
  }

  const UsageDisplay = () => (
    <div className="flex items-center gap-px">
      <RiRouteFill className="text-icon-sub h-3.5 w-3.5" />
      <span className="text-label-2xs text-text-soft">{usageCount}</span>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex cursor-pointer items-center gap-1 p-0">
          <span className="text-xs font-medium leading-3 text-gray-400">Used in</span>
          <UsageDisplay />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-lg border border-gray-200 bg-white p-1.5 pb-1 pt-1.5 shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="mb-1 text-xs font-medium leading-3 text-gray-400">Used in</div>
          {workflowsUsingLayout.map((workflow, index) => (
            <div key={index} className="flex min-w-[175px] items-center gap-1.5 rounded bg-gray-50 px-1 py-0.5">
              <RiRouteFill className="text-icon-sub h-3.5 w-3.5" />
              <div className="flex flex-col text-left leading-tight">
                <div className="text-xs font-medium leading-[14px] text-gray-600">{workflow.name}</div>
                <div
                  className="font-mono leading-[14px] tracking-tight text-gray-400"
                  style={{ fontSize: '8px', letterSpacing: '-0.16px' }}
                >
                  {workflow.slug}
                </div>
              </div>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

type WorkflowChangeType = {
  type: 'configuration' | 'steps' | 'translations';
  label: string;
  action: 'added' | 'modified' | 'deleted';
  count: number;
};

type WorkflowHoverCardProps = {
  workflowResource: IResourceDiffResult;
  children: React.ReactNode;
};

function WorkflowHoverCard({ workflowResource, children }: WorkflowHoverCardProps) {
  const changeTypes = useMemo(() => {
    const types: WorkflowChangeType[] = [];
    const { changes } = workflowResource;

    // Track different types of changes
    let hasWorkflowConfigChanges = false;
    let hasStepChanges = false;
    let hasTranslationChanges = false;

    // Count step changes by action
    const stepActionCounts = { added: 0, modified: 0, deleted: 0, moved: 0 };

    changes.forEach((change) => {
      if (change.resourceType === 'workflow') {
        // This is a workflow-level change
        hasWorkflowConfigChanges = true;

        // Check if it's specifically translation-related
        if (change.diffs) {
          const hasTranslationChange =
            'isTranslationEnabled' in (change.diffs.new || {}) ||
            'isTranslationEnabled' in (change.diffs.previous || {});

          if (hasTranslationChange) {
            hasTranslationChanges = true;
          }
        }
      } else if (change.resourceType === 'step') {
        // This is a step-level change
        hasStepChanges = true;

        if (change.action && change.action in stepActionCounts) {
          stepActionCounts[change.action as keyof typeof stepActionCounts]++;
        }
      }
    });

    // Add change types based on what we found
    if (hasWorkflowConfigChanges) {
      types.push({
        type: 'configuration',
        label: 'Workflow configuration',
        action: 'modified',
        count: 1,
      });
    }

    if (hasStepChanges) {
      // Use the most significant action (prioritize: added > modified > deleted > moved)
      let primaryAction: 'added' | 'modified' | 'deleted' = 'modified';
      let totalStepChanges = 0;

      if (stepActionCounts.added > 0) {
        primaryAction = 'added';
        totalStepChanges = stepActionCounts.added;
      } else if (stepActionCounts.modified > 0) {
        primaryAction = 'modified';
        totalStepChanges = stepActionCounts.modified;
      } else if (stepActionCounts.deleted > 0) {
        primaryAction = 'deleted';
        totalStepChanges = stepActionCounts.deleted;
      } else {
        totalStepChanges = stepActionCounts.moved;
      }

      types.push({
        type: 'steps',
        label: 'Steps & content',
        action: primaryAction,
        count: totalStepChanges,
      });
    }

    if (hasTranslationChanges) {
      types.push({
        type: 'translations',
        label: 'Translations',
        action: 'added',
        count: 1,
      });
    }

    return types;
  }, [workflowResource.changes]);

  const getChangeIcon = (action: 'added' | 'modified' | 'deleted') => {
    switch (action) {
      case 'added':
        return RiAddBoxLine;
      case 'modified':
        return RiGitCommitFill;
      case 'deleted':
        return RiDeleteBin2Line;
      default:
        return RiGitCommitFill;
    }
  };

  const getChangeColor = (action: 'added' | 'modified' | 'deleted') => {
    switch (action) {
      case 'added':
        return 'green' as const;
      case 'modified':
        return 'orange' as const;
      case 'deleted':
        return 'red' as const;
      default:
        return 'orange' as const;
    }
  };

  const getOverallStatus = () => {
    const { summary } = workflowResource;

    if (summary.added > 0) {
      return { action: 'added' as const, label: 'Added' };
    }

    if (summary.modified > 0) {
      return { action: 'modified' as const, label: 'Modified' };
    }

    if (summary.deleted > 0) {
      return { action: 'deleted' as const, label: 'Deleted' };
    }

    return { action: 'modified' as const, label: 'Modified' };
  };

  const overallStatus = getOverallStatus();

  if (changeTypes.length === 0) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        style={{
          filter: 'drop-shadow(0px 12px 24px rgba(14, 18, 27, 0.06)) drop-shadow(0px 1px 2px rgba(14, 18, 27, 0.03))',
        }}
      >
        <div className="flex flex-col gap-1">
          {/* Overall status badge */}
          <Badge variant="lighter" size="sm" color={getChangeColor(overallStatus.action)}>
            <BadgeIcon as={getChangeIcon(overallStatus.action)} />
            {overallStatus.label}
          </Badge>

          {/* Change type details */}
          <div className="flex flex-col gap-1.5">
            {changeTypes.map((changeType, index) => {
              const IconComponent = getChangeIcon(changeType.action);
              const color = getChangeColor(changeType.action);

              return (
                <div key={index} className="flex min-w-[175px] items-center gap-1.5 rounded p-1">
                  <div className={`flex h-[15px] w-[15px] items-center justify-center`}>
                    <IconComponent
                      className={`h-3 w-3 ${
                        color === 'green'
                          ? 'text-success-base'
                          : color === 'orange'
                            ? 'text-warning-base'
                            : color === 'red'
                              ? 'text-error-base'
                              : 'text-warning-base'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="font-medium text-gray-600" style={{ fontSize: '10px', lineHeight: '14px' }}>
                      {changeType.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function CompactResourceRow({
  resource,
  selected,
  disabled,
  onToggle,
  dependencies,
  allWorkflows = [],
  dependencyMap = new Map(),
}: SelectableResourceRowProps) {
  const displayName = resource.targetResource?.name || resource.sourceResource?.name || 'Unnamed Resource';
  const slug = displayName.toLowerCase().replace(/\s+/g, '-');
  const updatedAt = resource.sourceResource?.updatedAt || resource.targetResource?.updatedAt;
  const hasDependencies = dependencies && dependencies.length > 0;

  const getStatusBadge = () => {
    const summary = resource.summary;

    if (summary.added > 0) {
      return (
        <Badge variant="lighter" size="sm" color="green" className="text-label-2xs">
          <BadgeIcon as={RiAddBoxLine} />
          Added
        </Badge>
      );
    }

    if (summary.modified > 0) {
      const badge = (
        <Badge variant="lighter" size="sm" color="orange" className="text-label-2xs">
          <BadgeIcon as={RiGitCommitFill} />
          Modified
        </Badge>
      );

      if (resource.resourceType === 'workflow') {
        return <WorkflowHoverCard workflowResource={resource}>{badge}</WorkflowHoverCard>;
      }

      return badge;
    }

    if (summary.deleted > 0) {
      return (
        <Badge variant="lighter" size="sm" color="red" className="text-label-2xs">
          <BadgeIcon as={RiDeleteBin2Line} />
          Deleted
        </Badge>
      );
    }

    return null;
  };

  const rowContent = (
    <div className="flex items-center gap-1.5 p-1">
      {disabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Checkbox checked={selected} disabled={disabled} onCheckedChange={onToggle} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="rounded bg-gray-900 px-2 py-1 text-xs text-white">
            This resource is required by another selected resource and they must be published together.
          </TooltipContent>
        </Tooltip>
      ) : (
        <Checkbox checked={selected} disabled={disabled} onCheckedChange={onToggle} />
      )}

      <div className="min-w-0 flex-1">
        {resource.resourceType === 'layout' ? (
          // Layout: name and ID side by side
          <div className="leading-0 flex w-full items-center gap-1 text-nowrap text-left">
            <span className="overflow-hidden truncate overflow-ellipsis text-xs font-medium leading-4 text-gray-900">
              {displayName}
            </span>
            <span
              className="font-mono text-xs leading-[14px] tracking-tight text-gray-400"
              style={{ fontSize: '10px', letterSpacing: '-0.2px' }}
            >
              {slug}
            </span>
            {hasDependencies && (
              <Tooltip>
                <TooltipTrigger>
                  <RiLinkUnlinkM className="h-3 w-3 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>
                  {dependencies && dependencies.length > 0 && (
                    <div className="space-y-1">
                      <div>This layout depends on:</div>
                      {dependencies.map((dep, idx) => (
                        <div key={idx} className="text-xs">
                          - {dep.resourceName} ({dep.resourceType})
                        </div>
                      ))}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <span className="truncate text-xs font-medium text-gray-900">{displayName}</span>
              {hasDependencies && (
                <Tooltip>
                  <TooltipTrigger>
                    <RiLinkUnlinkM className="h-3 w-3 text-orange-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {dependencies && dependencies.length > 0 && (
                      <div className="space-y-1">
                        <div>This workflow depends on:</div>
                        {dependencies.map((dep, idx) => (
                          <div key={idx} className="text-xs">
                            - {dep.resourceName} ({dep.resourceType})
                          </div>
                        ))}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="font-mono text-xs tracking-tight text-gray-400">{slug}</div>
          </>
        )}

        {resource.resourceType === 'layout' && (
          <LayoutUsageIndicator layoutResource={resource} allWorkflows={allWorkflows} dependencies={dependencyMap} />
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5">
        {getStatusBadge()}

        {updatedAt && <span className="text-label-2xs text-text-sub">{formatDateSimple(updatedAt)}</span>}
      </div>
    </div>
  );

  return rowContent;
}
