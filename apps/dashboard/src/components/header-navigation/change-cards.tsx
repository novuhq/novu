import { useUser } from '@clerk/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { SquareMinus, TriangleAlert } from 'lucide-react';
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { RiContractUpDownLine, RiExpandUpDownLine } from 'react-icons/ri';
import type { IUserInfo } from '@/api/environments';
import type { ChangeDiffStat, ChangeGroup, ChangeRow, ResourceSelectionState } from '@/hooks/use-changes-tree';
import { cn } from '@/utils/ui';
import { Avatar, AvatarFallback } from '../primitives/avatar';
import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from '../primitives/hover-card';
import { Kbd } from '../primitives/kbd';
import { BreakingBadge, ChangeNote, DiffStat, ResourceStatusBadge } from './change-badges';
import { AGENT_INACTIVE_NOTE, dependentNames, removalNote } from './change-notes';
import { buildChangeCardModel, type ChangeSection, changeNodeKey, GROUP_ICONS, SECTION_ICONS } from './change-sections';
import { LayoutContentCompare } from './layout-change-preview';
import {
  EnvironmentHeader,
  type EnvironmentNames,
  JsonDiffCompare,
  PayloadSchemaPreview,
} from './payload-schema-preview';
import { type PublishEnvironments, StepChangeList } from './step-change-list';

type RegisterNode = (key: string) => (node: HTMLDivElement | null) => void;

export type ScrollRequest = {
  key: string;
  /** Bumps on every click, so selecting the same row again scrolls to it again. */
  nonce: number;
};

type ChangeCardsProps = {
  groups: ChangeGroup[];
  resourceSelection: ResourceSelectionState;
  /** Workflows that use a deleted resource included in this publish, keyed by workflow id. */
  dependencyWarnings: Map<string, string>;
  scrollRequest: ScrollRequest | null;
  scrollPaneRef: RefObject<HTMLDivElement | null>;
  environmentNames: EnvironmentNames;
  environments: PublishEnvironments;
};

function scrollNodeToCenter(pane: HTMLElement, node: HTMLElement) {
  const nodeTop = pane.scrollTop + node.getBoundingClientRect().top - pane.getBoundingClientRect().top;
  const top = nodeTop - (pane.clientHeight - node.getBoundingClientRect().height) / 2;
  const maxScroll = pane.scrollHeight - pane.clientHeight;

  pane.scrollTo({ top: Math.min(Math.max(0, top), maxScroll), behavior: 'smooth' });
}

/** Payload variables scroll inside the schema diff, which the preview owns. */
function isPayloadVariableKey(key: string): boolean {
  return key.includes(':payloadSchema:');
}

export function ChangesSummaryBar({ total, breaking }: { total: number; breaking: number }) {
  const totalLabel = total === 1 ? 'total change' : 'total changes';
  const breakingLabel = breaking === 1 ? 'breaking change' : 'breaking changes';

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-stroke-weak bg-bg-weak px-5 py-3">
      <div className="flex items-end gap-0.5">
        <span className="text-label-md leading-5 text-text-strong">{total}</span>
        <span className="ml-1 text-label-xs text-text-soft">{totalLabel}</span>
      </div>

      {breaking > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-warning-light bg-warning-lighter px-2 py-1.5">
          <TriangleAlert className="size-3.5 shrink-0 text-warning-base" aria-hidden />
          <span className="text-label-xs text-warning-base">
            {breaking} {breakingLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export function ChangeCards({
  groups,
  resourceSelection,
  dependencyWarnings,
  scrollRequest,
  scrollPaneRef,
  environmentNames,
  environments,
}: ChangeCardsProps) {
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());

  const registerNode = useCallback<RegisterNode>(
    (key) => (node) => {
      if (node) {
        nodeRefs.current.set(key, node);
      } else {
        nodeRefs.current.delete(key);
      }
    },
    []
  );

  useEffect(() => {
    if (!scrollRequest || isPayloadVariableKey(scrollRequest.key)) return;

    // Sections open after this commit. Wait for that layout, then center the target.
    // Aligning it to the top leaves the last sections stuck at the bottom of the pane.
    let frame = 0;
    const timeout = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        const pane = scrollPaneRef.current;
        const node = nodeRefs.current.get(scrollRequest.key);
        if (!pane || !node) {
          return;
        }

        scrollNodeToCenter(pane, node);
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [scrollRequest, scrollPaneRef]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {groups.flatMap((group) =>
        group.rows.map((row) => (
          <ChangeCard
            key={row.id}
            registerNode={registerNode}
            row={row}
            icon={GROUP_ICONS[group.type]}
            selected={resourceSelection[row.id]?.selected ?? false}
            dependencyWarning={dependencyWarnings.get(row.id)}
            environmentNames={environmentNames}
            environments={environments}
            scrollRequest={scrollRequest}
            scrollPaneRef={scrollPaneRef}
          />
        ))
      )}
    </div>
  );
}

function ChangeCard({
  registerNode,
  row,
  icon: Icon,
  selected,
  dependencyWarning,
  environmentNames,
  environments,
  scrollRequest,
  scrollPaneRef,
}: {
  registerNode: RegisterNode;
  row: ChangeRow;
  icon: IconType;
  selected: boolean;
  dependencyWarning?: string;
  environmentNames: EnvironmentNames;
  environments: PublishEnvironments;
  scrollRequest: ScrollRequest | null;
  scrollPaneRef: RefObject<HTMLDivElement | null>;
}) {
  const { sections, diffStat } = useMemo(() => buildChangeCardModel(row), [row]);
  const info = row.resource.sourceResource ?? row.resource.targetResource;
  const removal = row.status === 'deleted' ? removalNote(dependentNames(row.resource)) : null;
  const inactive = row.resource.resourceType === 'agent' && row.status === 'added' ? AGENT_INACTIVE_NOTE : null;

  return (
    <div
      ref={registerNode(changeNodeKey(row.id))}
      className={cn(
        'flex min-w-0 scroll-mt-3 flex-col gap-3 rounded-xl border border-stroke-soft bg-bg-white p-3 transition-opacity',
        !selected && 'opacity-50'
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <Icon className="size-4 shrink-0 text-text-sub" />
          <span className="truncate text-label-sm text-text-strong">{row.name}</span>
          {row.status !== 'modified' && <ResourceStatusBadge status={row.status} />}
        </div>

        <ChangeCardMeta updatedBy={info?.updatedBy} updatedAt={info?.updatedAt} diffStat={diffStat} />
      </div>

      {(removal || inactive || dependencyWarning) && (
        <div className="flex flex-col gap-2">
          {removal && <ChangeNote icon={SquareMinus} tone="error" text={removal} />}
          {inactive && <ChangeNote icon={TriangleAlert} tone="warning" text={inactive} />}
          {dependencyWarning && <ChangeNote icon={TriangleAlert} tone="warning" text={dependencyWarning} />}
        </div>
      )}

      {sections.length > 0 && (
        <>
          <div className="h-px w-full bg-stroke-weak" role="separator" />
          <div className="flex flex-col gap-2">
            {sections.map((section) => {
              const nodeKey = changeNodeKey(row.id, section.key);

              return (
                <ChangeSectionRow
                  key={section.key}
                  ref={registerNode(nodeKey)}
                  nodeKey={nodeKey}
                  selected={selected}
                  section={section}
                  workflowId={row.id}
                  environmentNames={environmentNames}
                  environments={environments}
                  scrollRequest={scrollRequest}
                  scrollPaneRef={scrollPaneRef}
                  registerNode={registerNode}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function joinedName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function isCurrentEditor(
  clerkUser: { id?: string; externalId?: string | null } | null | undefined,
  updatedBy: IUserInfo
): boolean {
  if (!clerkUser) return false;
  if (clerkUser.externalId && clerkUser.externalId === updatedBy._id) return true;
  if (updatedBy.externalId && clerkUser.id === updatedBy.externalId) return true;

  return false;
}

export function editorDisplayName(
  updatedBy: IUserInfo,
  clerkUser: { firstName?: string | null; lastName?: string | null } | null | undefined,
  isCurrentUser: boolean
): string {
  const storedName = joinedName(updatedBy.firstName, updatedBy.lastName);
  if (storedName) return storedName;

  if (isCurrentUser) {
    const clerkName = joinedName(clerkUser?.firstName, clerkUser?.lastName);
    if (clerkName) return clerkName;
  }

  const emailName = updatedBy.email?.split('@')[0]?.trim();
  if (emailName) return emailName;
  if (isCurrentUser) return 'You';

  return 'Someone';
}

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

const LOCAL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('default', DATE_TIME_FORMAT_OPTIONS);
const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('default', { ...DATE_TIME_FORMAT_OPTIONS, timeZone: 'UTC' });

function UpdatedAgoLabel({ relativeTime }: { relativeTime: string }) {
  return (
    <span className="text-label-xs whitespace-nowrap">
      <span className="text-text-soft">Updated </span>
      <span className="text-text-sub transition-colors group-hover:text-text-strong">{relativeTime}</span>
    </span>
  );
}

function ChangeCardMeta({
  updatedBy,
  updatedAt,
  diffStat,
}: {
  updatedBy?: IUserInfo | null;
  updatedAt?: string | null;
  diffStat: ChangeDiffStat;
}) {
  const { user } = useUser();
  const updatedAtDate = updatedAt ? new Date(updatedAt) : null;
  const hasUpdatedAt = Boolean(updatedAtDate && !Number.isNaN(updatedAtDate.getTime()));

  if (!hasUpdatedAt || !updatedAtDate) return null;

  const relativeTime = formatDistanceToNowStrict(updatedAtDate, { addSuffix: true });
  const hasDiff = diffStat.added > 0 || diffStat.deleted > 0;
  const isCurrentUser = updatedBy ? isCurrentEditor(user, updatedBy) : false;
  const authorName = updatedBy ? editorDisplayName(updatedBy, user, isCurrentUser) : null;

  return (
    <HoverCard openDelay={200} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`Updated ${relativeTime}`}
          className="group shrink-0 cursor-default rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong"
        >
          <UpdatedAgoLabel relativeTime={relativeTime} />
        </button>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[80] w-auto rounded-lg border-stroke-soft bg-bg-white p-0 shadow-popover"
        >
          <div className="flex min-w-[200px] flex-col">
            {authorName && (
              <div className="flex items-center gap-2 px-2.5 py-2">
                <Avatar className="size-6">
                  <AvatarFallback className="bg-primary-base text-[11px] font-medium text-static-white">
                    {authorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label-2xs leading-4 text-text-soft">Last updated by</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="max-w-40 truncate text-label-xs text-text-strong">{authorName}</span>
                    {isCurrentUser && (
                      <Kbd variant="flat" className="h-4 rounded bg-bg-weak">
                        You
                      </Kbd>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className={cn('flex flex-col gap-1 px-2.5 py-2', authorName && 'border-t border-stroke-weak')}>
              <div className="flex items-center justify-between gap-6">
                <span className="text-label-xs text-text-soft">Local</span>
                <span className="text-label-xs text-text-sub tabular-nums">
                  {LOCAL_DATE_TIME_FORMATTER.format(updatedAtDate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-label-xs text-text-soft">UTC</span>
                <span className="text-label-xs text-text-sub tabular-nums">
                  {UTC_DATE_TIME_FORMATTER.format(updatedAtDate)}
                </span>
              </div>
            </div>

            {hasDiff && (
              <div className="flex items-center justify-between gap-6 border-t border-stroke-weak px-2.5 py-2">
                <span className="text-label-xs text-text-soft">Lines changed</span>
                <DiffStat stat={diffStat} />
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}

function sectionCanExpand(section: ChangeSection, stepCount: number): boolean {
  if (section.schemaPreview || section.layoutPreview || section.fieldsDiff) {
    return true;
  }

  return stepCount > 0;
}

function ChangeSectionRow({
  ref,
  nodeKey,
  selected,
  section,
  workflowId,
  environmentNames,
  environments,
  scrollRequest,
  scrollPaneRef,
  registerNode,
}: {
  ref: (node: HTMLDivElement | null) => void;
  nodeKey: string;
  selected: boolean;
  section: ChangeSection;
  workflowId: string;
  environmentNames: EnvironmentNames;
  environments: PublishEnvironments;
  scrollRequest: ScrollRequest | null;
  scrollPaneRef: RefObject<HTMLDivElement | null>;
  registerNode: RegisterNode;
}) {
  const Icon = SECTION_ICONS[section.key];
  const stepItems = section.key === 'steps' ? (section.items ?? []) : [];
  const canExpand = sectionCanExpand(section, stepItems.length);
  const [expanded, setExpanded] = useState(false);
  const focusPath = scrollRequest?.key.startsWith(`${nodeKey}:`) ? scrollRequest.key.slice(nodeKey.length + 1) : null;

  const isTargeted = scrollRequest !== null && (scrollRequest.key === nodeKey || focusPath !== null);
  const targetNonce = isTargeted ? scrollRequest.nonce : 0;

  useEffect(() => {
    if (!selected) setExpanded(false);
  }, [selected]);

  useEffect(() => {
    if (targetNonce && canExpand) setExpanded(true);
  }, [targetNonce, canExpand]);

  return (
    <div ref={ref} className="flex min-w-0 scroll-mt-3 flex-col rounded-lg border border-stroke-weak bg-bg-weak p-1.5">
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex min-w-0 items-center gap-1">
          <span className="flex size-4 shrink-0 items-center justify-center">
            <Icon className="size-3.5 text-text-sub" />
          </span>
          <span className="truncate text-label-xs text-text-strong">{section.label}</span>
          {section.meta && <span className="min-w-0 truncate text-paragraph-xs text-text-soft">{section.meta}</span>}
          {section.status === 'breaking' && <BreakingBadge />}
          {section.status === 'deleted' && stepItems.length === 0 && <ResourceStatusBadge status="deleted" />}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DiffStat stat={section.diffStat} />
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="flex size-4 items-center justify-center text-text-soft"
              aria-expanded={expanded}
              aria-label={expanded ? `Collapse ${section.label}` : `Expand ${section.label}`}
            >
              {expanded ? <RiContractUpDownLine className="size-3" /> : <RiExpandUpDownLine className="size-3" />}
            </button>
          )}
        </div>
      </div>

      {section.status === 'deleted' && stepItems.length === 0 && (
        <ChangeNote className="mt-1" icon={SquareMinus} tone="error" text={removalNote([])} />
      )}

      {expanded && section.schemaPreview && (
        <PayloadSchemaPreview
          preview={section.schemaPreview}
          environmentNames={environmentNames}
          focusPath={focusPath}
          scrollNonce={scrollRequest?.nonce ?? 0}
          scrollPaneRef={scrollPaneRef}
        />
      )}

      {expanded && section.layoutPreview && section.fieldsDiff && (
        <LayoutContentCompare
          layoutId={workflowId}
          preview={section.layoutPreview}
          savedBodyDiff={section.fieldsDiff}
          environments={environments}
          environmentNames={environmentNames}
        />
      )}

      {expanded && section.fieldsDiff && !section.layoutPreview && (
        <div className="mt-1 flex min-w-0 flex-col gap-1 rounded-lg border border-stroke-soft bg-bg-white p-1.5">
          <div className="flex gap-1.5">
            <EnvironmentHeader name={environmentNames.target} tone="feature" />
            <EnvironmentHeader name={environmentNames.source} tone="warning" />
          </div>
          <JsonDiffCompare
            lineDiff={section.fieldsDiff.lineDiff}
            hasPrevious={section.fieldsDiff.hasPrevious}
            hasNext={section.fieldsDiff.hasNext}
            environmentNames={environmentNames}
          />
        </div>
      )}

      {expanded && stepItems.length > 0 && (
        <StepChangeList
          workflowId={workflowId}
          items={stepItems}
          nodeKey={nodeKey}
          registerNode={registerNode}
          scrollRequest={scrollRequest}
          environments={environments}
          environmentNames={environmentNames}
        />
      )}
    </div>
  );
}
