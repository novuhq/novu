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
} from 'react-icons/ri';
import { Dialog, DialogContent, DialogClose } from '../primitives/dialog';
import { Button } from '../primitives/button';
import { Badge } from '../primitives/badge';
import { Checkbox } from '../primitives/checkbox';
import { Separator } from '../primitives/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../primitives/collapsible';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { formatDateSimple } from '@/utils/format-date';
import type { IEnvironment } from '@novu/shared';
import type { IResourceDiffResult, IResourceDependency } from '@/api/environments';

type EnhancedPublishModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment;
  currentEnvironmentId?: string;
  onConfirm: (selectedResources: string[]) => void;
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

    // Build dependency map for quick lookup
    const depMap = new Map<string, IResourceDependency[]>();
    workflowResources.forEach((workflow) => {
      if (workflow.dependencies?.length) {
        const workflowId = workflow.sourceResource?.id || workflow.targetResource?.id;

        if (workflowId) {
          depMap.set(workflowId, workflow.dependencies);
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

      // Apply dependency rules based on currently selected workflows
      Object.entries(updated).forEach(([workflowId, workflowState]) => {
        if (workflowState.selected && workflowState.resource.resourceType === 'workflow') {
          const dependencies = dependencyMap.get(workflowId);

          if (dependencies) {
            dependencies.forEach((dep: IResourceDependency) => {
              // Find the dependent layout and mark as disabled if blocking
              Object.entries(updated).forEach(([layoutId, layoutState]) => {
                if (
                  layoutState.resource.resourceType === 'layout' &&
                  layoutState.resource.sourceResource?.name === dep.resourceName &&
                  dep.isBlocking
                ) {
                  updated[layoutId] = {
                    ...updated[layoutId],
                    selected: true,
                    disabled: true,
                  };
                }
              });
            });
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

    setResourceSelection(calculateDependencyState(initialSelection));
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
    const selectedIds = Object.entries(resourceSelection)
      .filter(([_, state]) => state.selected)
      .map(([id]) => id);
    onConfirm(selectedIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg gap-4 p-3">
        <div className="flex items-start justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-orange-50">
            <RiAlertFill className="h-6 w-6 text-orange-500" />
          </div>
          <DialogClose asChild>
            <button className="opacity-70 transition-opacity hover:opacity-100">
              <RiCloseFill className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-medium text-gray-900">Publishing changes to {environment?.name}</h2>
          <p className="text-xs text-gray-500">
            You're about to publish changes to {environment?.name}. This may cause breaking behavior. Please review all
            changes before proceeding.
          </p>
        </div>

        <div className="space-y-1.5">
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
                />
              );
            })}
          </ResourceGroupCompact>

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
                />
              );
            })}
          </ResourceGroupCompact>
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
            trailingIcon={RiAlertFill}
          >
            Publish to {environment?.name} ({getTotalSelectedCount()})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PublishModalHeader({
  environment,
  totalSelected,
  totalResources,
}: {
  environment: IEnvironment;
  totalSelected: number;
  totalResources: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="bg-warning-light flex h-8 w-8 items-center justify-center rounded-lg">
          <RiAlertFill className="text-warning-base h-4 w-4" />
        </div>
        <h2 className="text-label-md text-text-strong">Publishing changes to {environment?.name}</h2>
      </div>
      <p className="text-paragraph-sm text-text-soft">
        You're about to publish{' '}
        <span className="text-text-sub font-medium">
          {totalSelected} of {totalResources}
        </span>{' '}
        changes to {environment?.name}. This may cause breaking behavior. Please review all changes before proceeding.
      </p>
    </div>
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

        <div className="flex items-center gap-1">
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
};

function CompactResourceRow({ resource, selected, disabled, onToggle, dependencies }: SelectableResourceRowProps) {
  const displayName = resource.targetResource?.name || resource.sourceResource?.name || 'Unnamed Resource';
  const slug = displayName.toLowerCase().replace(/\s+/g, '-');
  const updatedBy = resource.sourceResource?.updatedBy || resource.targetResource?.updatedBy;
  const updatedAt = resource.sourceResource?.updatedAt || resource.targetResource?.updatedAt;
  const hasDependencies = dependencies && dependencies.length > 0;

  const getStatusBadge = () => {
    const summary = resource.summary;

    if (summary.added > 0) {
      return (
        <div className="flex items-center gap-0.5 rounded-full bg-green-50 px-1 py-0.5 pr-2">
          <div className="flex h-3 w-3 items-center justify-center">
            <div className="h-2 w-2 border border-green-500" />
          </div>
          <span className="text-xs font-medium text-green-600">Added</span>
        </div>
      );
    }

    if (summary.modified > 0) {
      return (
        <div className="flex items-center gap-0.5 rounded-full bg-orange-50 px-1 py-0.5 pr-2">
          <div className="flex h-3 w-3 items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          </div>
          <span className="text-xs font-medium text-orange-600">Modified</span>
        </div>
      );
    }

    if (summary.deleted > 0) {
      return (
        <div className="flex items-center gap-0.5 rounded-full bg-red-50 px-1 py-0.5 pr-2">
          <div className="flex h-3 w-3 items-center justify-center">
            <div className="h-2 w-0.5 bg-red-500" />
          </div>
          <span className="text-xs font-medium text-red-600">Deleted</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center gap-1.5 p-1">
      <Checkbox checked={selected} disabled={disabled} onCheckedChange={onToggle} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-medium text-gray-900">{displayName}</span>
          {hasDependencies && (
            <Tooltip>
              <TooltipTrigger>
                <RiLinkUnlinkM className="h-3 w-3 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>Has dependencies</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="font-mono text-xs tracking-tight text-gray-400">{slug}</div>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        {getStatusBadge()}

        {updatedBy && (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-full bg-gray-300" />
              </div>
              <span className="text-xs font-medium text-gray-600">{updatedBy.firstName}</span>
            </div>
            <div className="h-0.5 w-0.5 rounded-full bg-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {updatedAt ? formatDateSimple(updatedAt) : 'Unknown'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
