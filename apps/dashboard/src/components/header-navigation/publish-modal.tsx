import type { IEnvironment } from '@novu/shared';
import { useEffect, useState } from 'react';
import {
  RiAddBoxLine,
  RiAlertFill,
  RiContractUpDownLine,
  RiDashboardLine,
  RiDeleteBin2Line,
  RiExpandUpDownLine,
  RiGitCommitFill,
  RiLinkUnlinkM,
  RiRouteFill,
} from 'react-icons/ri';
import type { IResourceDependency, IResourceDiffResult, ResourceToPublish } from '@/api/environments';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { useResourceDependencies } from '@/hooks/use-resource-dependencies';
import { formatDateSimple } from '@/utils/format-date';
import { Badge, BadgeIcon } from '../primitives/badge';
import { Button } from '../primitives/button';
import { Checkbox } from '../primitives/checkbox';
import { Collapsible, CollapsibleContent } from '../primitives/collapsible';
import { Dialog, DialogContent } from '../primitives/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { LayoutUsageIndicator } from './layout-usage-indicator';
import { WorkflowHoverCard } from './workflow-hover-card';

type PublishModalProps = {
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

export function PublishModal({
  isOpen,
  onClose,
  environment,
  currentEnvironmentId,
  onConfirm,
  isPublishing = false,
}: PublishModalProps) {
  const [resourceSelection, setResourceSelection] = useState<ResourceSelection>({});
  const [workflowsExpanded, setWorkflowsExpanded] = useState(true);
  const [layoutsExpanded, setLayoutsExpanded] = useState(true);

  const { data: diffData } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment?._id,
    enabled: isOpen,
  });

  const { workflows, layouts, dependencyMap, calculateDependencyState } = useResourceDependencies(diffData);

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
        <PublishModalHeader />
        <PublishModalContent environment={environment} />

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

        <PublishModalActions
          environment={environment}
          totalSelected={getTotalSelectedCount()}
          isPublishing={isPublishing}
          onClose={onClose}
          onConfirm={handleConfirm}
        />
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
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 overflow-x-hidden">{children}</div>
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

  const statusBadge = <ResourceStatusBadge resource={resource} />;

  const rowContent = (
    <div className="flex items-center gap-1.5 p-1 min-w-0">
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
          <div className="leading-0 flex w-full items-center gap-1 text-left min-w-0">
            <span className="overflow-hidden truncate overflow-ellipsis text-xs font-medium leading-4 text-gray-900 flex-shrink min-w-0">
              {displayName}
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
        {statusBadge}

        {updatedAt && <span className="text-label-2xs text-text-sub">{formatDateSimple(updatedAt)}</span>}
      </div>
    </div>
  );

  return rowContent;
}

// Extracted Components
function ResourceStatusBadge({ resource }: { resource: IResourceDiffResult }) {
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
}

function PublishModalHeader() {
  return (
    <div className="flex items-start justify-between">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-orange-50">
        <RiAlertFill className="h-6 w-6 text-orange-500" />
      </div>
    </div>
  );
}

function PublishModalContent({ environment }: { environment: IEnvironment }) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-medium text-gray-900">Publishing changes to {environment?.name}</h2>
      <p className="text-xs text-gray-500">
        You're about to publish changes to {environment?.name}. This may cause breaking behavior. Please review all
        changes before proceeding.
      </p>
    </div>
  );
}

function PublishModalActions({
  environment,
  totalSelected,
  isPublishing,
  onClose,
  onConfirm,
}: {
  environment: IEnvironment;
  totalSelected: number;
  isPublishing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" mode="outline" size="2xs" onClick={onClose} disabled={isPublishing}>
        Cancel
      </Button>

      <Button
        variant="primary"
        mode="gradient"
        size="2xs"
        onClick={onConfirm}
        disabled={totalSelected === 0 || isPublishing}
        isLoading={isPublishing}
      >
        Publish to {environment?.name} <span className="text-[#E1E4EA]">({totalSelected})</span>
      </Button>
    </div>
  );
}
