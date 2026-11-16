import { SquareMinus, SquarePlus, TriangleAlert } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { RiArrowDownSLine, RiArrowRightSLine, RiGitCommitFill, RiSearchLine } from 'react-icons/ri';
import {
  type ChangeGroup,
  type ChangeGroupType,
  type ChangeRow,
  type ChangeStatus,
  type RequiredByResource,
  type ResourceSelectionState,
  resolveTreeIconStatus,
} from '@/hooks/use-changes-tree';
import { cn } from '@/utils/ui';
import { Checkbox } from '../primitives/checkbox';
import { Input } from '../primitives/input';
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import {
  buildChangeCardModel,
  type ChangeSection,
  type ChangeSectionItem,
  changeItemKey,
  changeNodeKey,
  GROUP_ICONS,
  getStepIcon,
  SECTION_ICONS,
} from './change-sections';

type ChangesSidebarProps = {
  groups: ChangeGroup[];
  resourceSelection: ResourceSelectionState;
  onToggleResource: (id: string) => void;
  onToggleGroup: (groupType: ChangeGroupType) => void;
  /** Called with the card or section key (see `changeNodeKey`) that the clicked tree node maps to. */
  onNavigate: (nodeKey: string) => void;
};

// Steps open onto each changed step. The other sections stay one row, matching the changes tree.
const EXPANDED_BY_DEFAULT_SECTIONS = new Set<ChangeSection['key']>(['steps']);

function sectionMapKey(groupType: ChangeGroupType, rowId: string): string {
  return `${groupType}:${rowId}`;
}

export function ChangesSidebar({
  groups,
  resourceSelection,
  onToggleResource,
  onToggleGroup,
  onNavigate,
}: ChangesSidebarProps) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<ChangeGroupType, boolean>>({
    workflow: true,
    layout: true,
    agent: true,
  });
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [activeNodeKey, setActiveNodeKey] = useState<string | null>(null);
  const [pointedIds, setPointedIds] = useState<string[]>([]);
  const previousSelection = useRef(resourceSelection);
  const treeRef = useRef<HTMLDivElement>(null);

  const sectionsByRowId = useMemo(() => {
    const map = new Map<string, ChangeSection[]>();
    for (const group of groups) {
      for (const row of group.rows) {
        map.set(sectionMapKey(group.type, row.id), buildChangeCardModel(row).sections);
      }
    }

    return map;
  }, [groups]);

  const normalizedSearch = search.trim().toLowerCase();

  const visibleGroups = groups
    .map((group) => {
      const visibleRows = normalizedSearch
        ? group.rows.filter((row) => row.name.toLowerCase().includes(normalizedSearch))
        : group.rows;
      const selectedCount = group.rows.filter((row) => resourceSelection[row.id]?.selected).length;

      return { group, visibleRows, selectedCount };
    })
    .filter(({ visibleRows }) => visibleRows.length > 0);

  // Unchecking a change closes its branch. Rechecking leaves it closed until the chevron is used.
  useEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = resourceSelection;

    const collapsedIds = groups.flatMap((group) =>
      group.rows
        .filter((row) => previous[row.id]?.selected !== false && resourceSelection[row.id]?.selected === false)
        .map((row) => row.id)
    );
    if (collapsedIds.length === 0) return;

    setExpandedNodes((nodes) => {
      const next = { ...nodes };
      for (const id of collapsedIds) next[id] = false;

      return next;
    });
  }, [groups, resourceSelection]);

  const isNodeExpanded = (key: string, expandedByDefault: boolean) => expandedNodes[key] ?? expandedByDefault;

  const toggleNode = (key: string, expandedByDefault: boolean) => {
    setExpandedNodes((prev) => ({ ...prev, [key]: !(prev[key] ?? expandedByDefault) }));
  };

  const selectNode = (nodeKey: string, navigateTo: string) => {
    setActiveNodeKey(nodeKey);
    onNavigate(navigateTo);
  };

  const focusRequiredResource = (id: string) => {
    const group = groups.find((item) => item.rows.some((row) => row.id === id));
    const row = groups.flatMap((item) => item.rows).find((item) => item.id === id);
    const hiddenBySearch = !!row && !!normalizedSearch && !row.name.toLowerCase().includes(normalizedSearch);
    if (group) {
      setExpandedGroups((prev) => ({ ...prev, [group.type]: true }));
    }
    if (hiddenBySearch) {
      setSearch('');
    }
    selectNode(id, changeNodeKey(id));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const node = treeRef.current?.querySelector(`[data-change-row="${CSS.escape(id)}"]`);
        if (node instanceof HTMLElement) {
          node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    });
  };

  return (
    <div className="flex h-full min-h-0 w-[300px] shrink-0 flex-col gap-3 border-r border-stroke-soft bg-bg-white px-2.5 py-3">
      <Input
        size="xs"
        leadingIcon={RiSearchLine}
        placeholder="Search changes"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div ref={treeRef} className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {visibleGroups.map(({ group, visibleRows, selectedCount }, index) => {
          const isGroupExpanded = expandedGroups[group.type];

          return (
            <div key={group.type} className={cn('flex flex-col gap-0.5', index > 0 && 'mt-2.5')}>
              <ChangeGroupHeaderRow
                group={group}
                selectedCount={selectedCount}
                isExpanded={isGroupExpanded}
                onToggleExpanded={() => setExpandedGroups((prev) => ({ ...prev, [group.type]: !prev[group.type] }))}
                onToggleGroup={() => onToggleGroup(group.type)}
              />

              {isGroupExpanded &&
                visibleRows.map((row) => {
                  const sections = sectionsByRowId.get(sectionMapKey(group.type, row.id)) ?? [];
                  // A workflow's sections match the card on the right, so the tree opens onto them.
                  const isRowExpanded = sections.length > 0 && isNodeExpanded(row.id, true);
                  const selected = resourceSelection[row.id]?.selected ?? false;

                  return (
                    <div key={row.id} className="flex flex-col gap-0.5">
                      <ResourceTreeRow
                        row={row}
                        icon={GROUP_ICONS[group.type]}
                        selected={selected}
                        disabled={resourceSelection[row.id]?.disabled ?? false}
                        requiredBy={resourceSelection[row.id]?.requiredBy ?? []}
                        pointed={pointedIds.includes(row.id)}
                        isActive={activeNodeKey === row.id}
                        isExpandable={sections.length > 0}
                        isExpanded={isRowExpanded}
                        onToggle={() => onToggleResource(row.id)}
                        onToggleExpanded={() => toggleNode(row.id, true)}
                        onFocusRequired={focusRequiredResource}
                        onPoint={(ids) => setPointedIds(ids)}
                        onSelect={() => {
                          if (sections.length > 0 && !isRowExpanded) toggleNode(row.id, true);
                          selectNode(row.id, changeNodeKey(row.id));
                        }}
                      />

                      {isRowExpanded &&
                        sections.map((section) => {
                          const sectionKey = changeNodeKey(row.id, section.key);
                          const items = section.items ?? [];
                          const expandedByDefault = EXPANDED_BY_DEFAULT_SECTIONS.has(section.key);
                          const isSectionExpanded = items.length > 0 && isNodeExpanded(sectionKey, expandedByDefault);

                          return (
                            <div key={section.key} className="flex flex-col gap-0.5">
                              <SectionTreeRow
                                section={section}
                                dimmed={!selected}
                                isActive={activeNodeKey === sectionKey}
                                isExpandable={items.length > 0}
                                isExpanded={isSectionExpanded}
                                onToggleExpanded={() => toggleNode(sectionKey, expandedByDefault)}
                                onSelect={() => selectNode(sectionKey, sectionKey)}
                              />

                              {isSectionExpanded &&
                                items.map((item) => {
                                  const itemKey = changeItemKey(row.id, section.key, item.id);

                                  return (
                                    <ItemTreeRow
                                      key={item.id}
                                      item={item}
                                      dimmed={!selected}
                                      isActive={activeNodeKey === itemKey}
                                      onSelect={() => selectNode(itemKey, itemKey)}
                                    />
                                  );
                                })}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getGroupCheckedState(selectedCount: number, total: number): boolean | 'indeterminate' {
  if (total > 0 && selectedCount === total) return true;
  if (selectedCount > 0) return 'indeterminate';

  return false;
}

function ChangeGroupHeaderRow({
  group,
  selectedCount,
  isExpanded,
  onToggleExpanded,
  onToggleGroup,
}: {
  group: ChangeGroup;
  selectedCount: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleGroup: () => void;
}) {
  const total = group.rows.length;
  const Icon = GROUP_ICONS[group.type];

  return (
    <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-md pl-1.5 pr-2">
      <Checkbox
        className="size-5 shrink-0"
        checked={getGroupCheckedState(selectedCount, total)}
        onCheckedChange={onToggleGroup}
      />

      <TreeChevron label={group.label} isExpanded={isExpanded} onToggle={onToggleExpanded} />

      <Icon className="size-3.5 shrink-0 text-text-sub" />

      <span className="shrink-0 text-[13px] font-medium leading-5 text-text-strong">{group.label}</span>

      <span className="shrink-0 text-[13px] font-medium leading-5 text-text-soft">
        {selectedCount} of {total}
      </span>

      <div className="flex-1" />
    </div>
  );
}

function TreeRowShell({
  isActive,
  pointed,
  rowId,
  onSelect,
  children,
}: {
  isActive: boolean;
  pointed?: boolean;
  rowId?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-change-row={rowId}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
      className={cn(
        'flex h-7 shrink-0 items-center gap-1.5 rounded-md pl-1.5 pr-2 hover:bg-bg-weak',
        isActive && 'bg-bg-muted hover:bg-bg-muted',
        pointed && !isActive && 'bg-bg-weak ring-1 ring-inset ring-stroke-strong'
      )}
    >
      {children}
    </div>
  );
}

function TreeChevron({ label, isExpanded, onToggle }: { label: string; isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="flex size-4 shrink-0 items-center justify-center text-text-soft"
      aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
      aria-expanded={isExpanded}
    >
      {isExpanded ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowRightSLine className="size-3.5" />}
    </button>
  );
}

function TreeIcon({ icon: Icon }: { icon: IconType }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <Icon className="size-3.5 text-text-sub" />
    </span>
  );
}

function groupIcon(resourceType: string): IconType {
  if (resourceType === 'workflow' || resourceType === 'layout' || resourceType === 'agent') {
    return GROUP_ICONS[resourceType];
  }

  return RiGitCommitFill;
}

function RequiredByList({ resources, onFocus }: { resources: RequiredByResource[]; onFocus: (id: string) => void }) {
  if (resources.length === 0) {
    return (
      <p className="px-1.5 py-1 text-label-xs text-text-sub">
        This stays selected because another selected change needs it.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="px-1.5 pb-0.5 pt-1 text-label-xs text-text-soft">Required by</p>
      <div className="flex max-h-36 flex-col overflow-y-auto">
        {resources.map((resource) => {
          const Icon = groupIcon(resource.resourceType);

          return (
            <button
              key={resource.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onFocus(resource.id);
              }}
              className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left hover:bg-bg-weak"
            >
              <Icon className="size-3.5 shrink-0 text-text-sub" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-strong">{resource.name}</span>
            </button>
          );
        })}
      </div>
      <p className="px-1.5 pb-1 pt-0.5 text-[11px] leading-4 text-text-soft">They publish together.</p>
    </div>
  );
}

function ResourceTreeRow({
  row,
  icon,
  selected,
  disabled,
  requiredBy,
  pointed,
  isActive,
  isExpandable,
  isExpanded,
  onToggle,
  onToggleExpanded,
  onFocusRequired,
  onPoint,
  onSelect,
}: {
  row: ChangeRow;
  icon: IconType;
  selected: boolean;
  disabled: boolean;
  requiredBy: RequiredByResource[];
  pointed: boolean;
  isActive: boolean;
  isExpandable: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleExpanded: () => void;
  onFocusRequired: (id: string) => void;
  onPoint: (ids: string[]) => void;
  onSelect: () => void;
}) {
  const checkbox = (
    <Checkbox className="size-5 shrink-0" checked={selected} disabled={disabled} onCheckedChange={onToggle} />
  );
  // Collapsed, Breaking replaces Modified when any nested change can stop current triggers;
  // expanded, the row keeps its own status and the Payload schema section carries Breaking.
  const iconStatus = resolveTreeIconStatus(row, isExpanded);
  const requiredIds = requiredBy.map((resource) => resource.id);

  return (
    <TreeRowShell isActive={isActive} pointed={pointed} rowId={row.id} onSelect={onSelect}>
      {disabled ? (
        <Tooltip onOpenChange={(open) => onPoint(open ? requiredIds : [])}>
          <TooltipTrigger asChild>
            <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
              {checkbox}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" variant="light" className="w-[220px] p-1">
            <RequiredByList resources={requiredBy} onFocus={onFocusRequired} />
            <TooltipArrow variant="light" />
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
          {checkbox}
        </div>
      )}

      <div className="size-4 shrink-0" />

      {isExpandable ? (
        <TreeChevron label={row.name} isExpanded={isExpanded} onToggle={onToggleExpanded} />
      ) : (
        <div className="size-4 shrink-0" />
      )}

      <TreeIcon icon={icon} />

      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[13px] font-medium leading-5',
          selected ? 'text-text-strong' : 'text-text-soft'
        )}
      >
        {row.name}
      </span>

      <ChangeStatusIcon status={iconStatus} className={cn(!selected && 'opacity-40')} />
    </TreeRowShell>
  );
}

function SectionTreeRow({
  section,
  dimmed,
  isActive,
  isExpandable,
  isExpanded,
  onToggleExpanded,
  onSelect,
}: {
  section: ChangeSection;
  dimmed: boolean;
  isActive: boolean;
  isExpandable: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onSelect: () => void;
}) {
  return (
    <TreeRowShell isActive={isActive} onSelect={onSelect}>
      <div className="size-4 shrink-0" />
      <div className="h-4 w-8 shrink-0" />

      {isExpandable ? (
        <TreeChevron label={section.label} isExpanded={isExpanded} onToggle={onToggleExpanded} />
      ) : (
        <div className="size-4 shrink-0" />
      )}

      <TreeIcon icon={SECTION_ICONS[section.key]} />

      <TreeNodeLabel label={section.label} isActive={isActive} dimmed={dimmed} />

      <ChangeStatusIcon status={section.status} className={cn(dimmed && 'opacity-40')} />
    </TreeRowShell>
  );
}

function ItemTreeRow({
  item,
  dimmed,
  isActive,
  onSelect,
}: {
  item: ChangeSectionItem;
  dimmed: boolean;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <TreeRowShell isActive={isActive} onSelect={onSelect}>
      <div className="size-4 shrink-0" />
      <div className="h-4 w-12 shrink-0" />
      <div className="size-4 shrink-0" />

      <TreeIcon icon={getStepIcon(item.stepType)} />

      <TreeNodeLabel label={item.name} isActive={isActive} dimmed={dimmed} />

      <ChangeStatusIcon status={item.status} className={cn(dimmed && 'opacity-40')} />
    </TreeRowShell>
  );
}

function TreeNodeLabel({ label, isActive, dimmed }: { label: string; isActive: boolean; dimmed: boolean }) {
  return (
    <span
      className={cn(
        'min-w-0 flex-1 truncate text-[13px] leading-5',
        isActive ? 'font-medium text-text-strong' : 'text-text-sub',
        dimmed && 'text-text-soft'
      )}
    >
      {label}
    </span>
  );
}

const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
  breaking: 'Breaking',
};

function ChangeStatusIcon({ status, className }: { status: ChangeStatus; className?: string }) {
  const iconClassName = cn('size-3.5 shrink-0', className);
  const label = CHANGE_STATUS_LABEL[status];

  switch (status) {
    case 'added':
      return <SquarePlus className={cn(iconClassName, 'text-success-base')} role="img" aria-label={label} />;
    case 'modified':
      return <RiGitCommitFill className={cn(iconClassName, 'text-warning-base')} role="img" aria-label={label} />;
    case 'deleted':
      return <SquareMinus className={cn(iconClassName, 'text-error-base')} role="img" aria-label={label} />;
    case 'breaking':
      return <TriangleAlert className={cn(iconClassName, 'text-warning-base')} role="img" aria-label={label} />;
    default: {
      const _exhaustiveCheck: never = status;

      return _exhaustiveCheck;
    }
  }
}
