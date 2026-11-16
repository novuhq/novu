import type { IEnvironment } from '@novu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiCloseFill, RiTerminalFill } from 'react-icons/ri';
import type { IResourceDiffResult, ResourceToPublish } from '@/api/environments';
import { useEnvironment } from '@/context/environment/hooks';
import { useAreConversationalAgentsAvailable } from '@/hooks/use-are-conversational-agents-available';
import { type ResourceSelectionState, useChangesTree } from '@/hooks/use-changes-tree';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { useResourceDependencies } from '@/hooks/use-resource-dependencies';
import { Button } from '../primitives/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../primitives/dialog';
import { ChangeCards, ChangesSummaryBar, type ScrollRequest } from './change-cards';
import { dependencyWarningsByWorkflow } from './change-notes';
import { summarizeChangeRows } from './change-sections';
import { ChangesSidebar } from './changes-sidebar';

type PublishModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment;
  currentEnvironmentId?: string;
  onConfirm: (selectedResources: ResourceToPublish[]) => void;
  isPublishing?: boolean;
};

type ResourceGroupKey = 'workflow' | 'layout' | 'agent';

export function PublishModal({
  isOpen,
  onClose,
  environment,
  currentEnvironmentId,
  onConfirm,
  isPublishing = false,
}: PublishModalProps) {
  const [resourceSelection, setResourceSelection] = useState<ResourceSelectionState>({});
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(null);
  const scrollPaneRef = useRef<HTMLDivElement>(null);

  const { data: diffData } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment?._id,
    enabled: isOpen,
  });

  const areAgentsAvailable = useAreConversationalAgentsAvailable();
  const { environments } = useEnvironment();
  const sourceEnvironment = environments?.find((env) => env._id === currentEnvironmentId);
  const environmentNames = useMemo(
    () => ({
      source: sourceEnvironment?.name ?? 'Development',
      target: environment?.name ?? 'Production',
    }),
    [sourceEnvironment?.name, environment?.name]
  );
  const publishEnvironments = useMemo(
    () => ({ source: sourceEnvironment, target: environment }),
    [sourceEnvironment, environment]
  );

  const { workflows, layouts, agents, calculateDependencyState } = useResourceDependencies(diffData);
  const changesTree = useChangesTree(workflows, layouts, areAgentsAvailable ? agents : []);
  const changeGroups = useMemo(() => [changesTree.workflows, changesTree.layouts, changesTree.agents], [changesTree]);
  const changeSummary = useMemo(() => summarizeChangeRows(changeGroups.flatMap((group) => group.rows)), [changeGroups]);
  const dependencyWarnings = useMemo(
    () =>
      dependencyWarningsByWorkflow(
        diffData?.resources ?? [],
        (resourceId) => resourceSelection[resourceId]?.selected === true
      ),
    [diffData?.resources, resourceSelection]
  );

  const groupedRows = useMemo(() => {
    return {
      workflow: changesTree.workflows.rows,
      layout: changesTree.layouts.rows,
      agent: changesTree.agents.rows,
    } satisfies Record<ResourceGroupKey, { id: string; resource: IResourceDiffResult }[]>;
  }, [changesTree]);

  // Initialize selection state
  useEffect(() => {
    if (!diffData?.resources) return;

    const initialSelection: ResourceSelectionState = {};

    diffData.resources.forEach((resource) => {
      if (!areAgentsAvailable && resource.resourceType === 'agent') {
        return;
      }

      const resourceId = resource.sourceResource?.id || resource.targetResource?.id;

      if (resourceId) {
        initialSelection[resourceId] = {
          selected: true, // Start with all selected
          disabled: false,
          requiredBy: [],
          resource,
        };
      }
    });

    // Apply dependency rules to the initial selection
    const selectionWithDependencies = calculateDependencyState(initialSelection);
    setResourceSelection(selectionWithDependencies);
  }, [diffData, calculateDependencyState, areAgentsAvailable]);

  const handleResourceToggle = (resourceId: string) => {
    setResourceSelection((prev) => {
      const current = prev[resourceId];
      if (!current || current.disabled) return prev;

      const updated = { ...prev };
      updated[resourceId] = { ...current, selected: !current.selected };

      // Recalculate dependency state after the selection change
      return calculateDependencyState(updated);
    });
  };

  const handleGroupToggle = (groupKey: ResourceGroupKey) => {
    const rows = groupedRows[groupKey];
    const allSelected = rows.every((row) => resourceSelection[row.id]?.selected);

    setResourceSelection((prev) => {
      const updated = { ...prev };
      rows.forEach((row) => {
        if (!updated[row.id]?.disabled) {
          updated[row.id] = { ...updated[row.id], selected: !allSelected };
        }
      });

      // Recalculate dependency state after the group selection change
      return calculateDependencyState(updated);
    });
  };

  const getTotalSelectedCount = () => {
    return Object.values(resourceSelection).filter((state) => state.selected).length;
  };

  const handleConfirm = () => {
    const selectedResources: ResourceToPublish[] = Object.values(resourceSelection)
      .filter((state) => state.selected)
      .flatMap((state) => {
        const resourceId = state.resource.sourceResource?.id || state.resource.targetResource?.id;
        if (!resourceId) {
          return [];
        }

        return [
          {
            resourceType: state.resource.resourceType as ResourceToPublish['resourceType'],
            resourceId,
          },
        ];
      });
    onConfirm(selectedResources);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex h-[min(800px,calc(100vh-182px))] w-[min(1100px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border-0 p-0"
        hideCloseButton
      >
        <PublishModalHeader environment={environment} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ChangesSidebar
            groups={changeGroups}
            resourceSelection={resourceSelection}
            onToggleResource={handleResourceToggle}
            onToggleGroup={handleGroupToggle}
            onNavigate={(key) => setScrollRequest({ key, nonce: Date.now() })}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg-weak">
            {diffData && <ChangesSummaryBar total={changeSummary.total} breaking={changeSummary.breaking} />}

            <div
              ref={scrollPaneRef}
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-4 py-3"
            >
              <ChangeCards
                groups={changeGroups}
                resourceSelection={resourceSelection}
                dependencyWarnings={dependencyWarnings}
                scrollRequest={scrollRequest}
                scrollPaneRef={scrollPaneRef}
                environmentNames={environmentNames}
                environments={publishEnvironments}
              />
              {/* Room below the last card so a sidebar click can bring it to the middle of the pane. */}
              <div aria-hidden className="h-1/2 shrink-0" />
            </div>
          </div>
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

function PublishModalHeader({ environment }: { environment: IEnvironment }) {
  const description = 'Publishing may cause breaking behavior. Please review before proceeding.';

  return (
    <div className="flex items-start gap-2 border-b border-stroke-soft bg-bg-white p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <DialogTitle className="sr-only">Publish changes to {environment?.name}</DialogTitle>
          <h2 className="shrink-0 text-label-md text-text-strong">Publish changes to</h2>
          {environment?.name && (
            <span className="inline-flex min-w-0 max-w-[200px] items-center gap-1.5 rounded bg-feature-lighter py-0.5 pl-0.5 pr-1">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-feature-lighter p-[3px] text-feature-base">
                <RiTerminalFill className="size-2.5" />
              </span>
              <span className="truncate text-label-xs text-feature-base">{environment.name}</span>
            </span>
          )}
        </div>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <p className="text-paragraph-xs text-text-soft">{description}</p>
      </div>

      <DialogClose asChild>
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center text-text-soft transition-colors hover:text-text-strong"
          aria-label="Close"
        >
          <RiCloseFill className="size-4" />
        </button>
      </DialogClose>
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
    <div className="flex items-center gap-2 border-t border-stroke-soft bg-bg-white py-2.5 pl-5 pr-3">
      <div className="flex flex-1 items-center justify-end gap-2">
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
    </div>
  );
}
