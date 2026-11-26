import {
  ChannelTypeEnum,
  EnvironmentTypeEnum,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
} from '@novu/shared';
import type { ReactNode } from 'react';
import {
  RiArrowRightSLine,
  RiArrowRightUpLine,
  RiBarChartBoxLine,
  RiClipboardLine,
  RiDeleteBin2Line,
  RiFlashlightLine,
  RiInformationLine,
  RiMoreFill,
  RiStackLine,
  RiStarLine,
} from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { SheetHeader, SheetTitle } from '@/components/primitives/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import type { DuplicateTarget } from './hooks/use-duplicate-integration';
import type { IntegrationHealth } from './hooks/use-integration-health';
import { ProviderIcon } from './provider-icon';
import { CHANNEL_LABELS } from './utils/helpers';

const CARD_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]';
const MENU_CLASS =
  'bg-bg-weak min-w-[200px] rounded-xl border-0 p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]';
const ITEM_CLASS =
  'text-text-sub focus:text-text-strong h-7 gap-2 rounded px-2 py-0 text-[13px] leading-[1.1] focus:bg-[#f4f4f5] [&>svg]:size-[15px]';

const TONE_TEXT: Record<IntegrationHealth['tone'], string> = {
  success: 'text-success-base',
  error: 'text-error-base',
  warning: 'text-warning-base',
  neutral: 'text-text-soft',
};
const TONE_DOT: Record<IntegrationHealth['tone'], { halo: string; dot: string }> = {
  success: { halo: 'bg-success/15', dot: 'bg-success' },
  error: { halo: 'bg-error-base/15', dot: 'bg-error-base' },
  warning: { halo: 'bg-warning/15', dot: 'bg-warning' },
  neutral: { halo: 'bg-neutral-alpha-100', dot: 'bg-text-soft' },
};

/** The API returns the stored timestamps, but the shared type doesn't declare them. */
function getTimestamp(integration: IIntegration, field: 'createdAt' | 'updatedAt') {
  const value = (integration as IIntegration & Partial<Record<'createdAt' | 'updatedAt', unknown>>)[field];

  return typeof value === 'string' ? value : undefined;
}

/** "Oct 3 2026 11:20:05 UTC" */
function formatUtc(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const time = date.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' });

  return `${month} ${date.getUTCDate()} ${date.getUTCFullYear()} ${time} UTC`;
}

export function HealthDot({ tone }: { tone: IntegrationHealth['tone'] }) {
  const style = TONE_DOT[tone];

  return (
    <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full', style.halo)}>
      <span className={cn('size-1.5 rounded-full', style.dot)} />
    </span>
  );
}

/** "Duplicate to…": the other environments, live ones under their own heading, and what gets copied. */
function DuplicateSubmenu({
  targets,
  note,
  isDuplicating,
  onDuplicate,
}: {
  targets: DuplicateTarget[];
  note: string;
  isDuplicating: boolean;
  onDuplicate: (environment: IEnvironment) => void;
}) {
  const development = targets.filter((target) => target.environment.type !== EnvironmentTypeEnum.PROD);
  const live = targets.filter((target) => target.environment.type === EnvironmentTypeEnum.PROD);

  const renderRow = ({ environment, existing }: DuplicateTarget) => (
    <DropdownMenuItem
      key={environment._id}
      disabled={!!existing || isDuplicating}
      onSelect={() => onDuplicate(environment)}
      className="group/env h-8 gap-2 rounded-lg px-2 py-1.5 focus:bg-[#f5f7fa] data-[disabled]:opacity-100"
    >
      <EnvironmentBranchIcon environment={environment} size="xs" />
      <span className="text-label-sm text-text-strong group-data-[disabled]/env:text-text-soft flex-1 truncate">
        {environment.name}
      </span>
      <span className="text-label-xs text-text-soft shrink-0">{existing ? 'Already set up' : 'Not set up'}</span>
    </DropdownMenuItem>
  );

  return (
    <DropdownMenuSubContent
      sideOffset={6}
      className="bg-bg-white flex w-64 flex-col gap-0.5 rounded-xl border-0 p-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]"
    >
      {development.map(renderRow)}
      {live.length > 0 && (
        <>
          <span className="text-text-soft px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase leading-5 tracking-wide">
            Live environments
          </span>
          {live.map(renderRow)}
        </>
      )}
      <p className="text-label-xs text-text-soft px-2 pb-1 pt-1.5">{note}</p>
    </DropdownMenuSubContent>
  );
}

export function ManageIntegrationHeader({
  integration,
  provider,
  canVerify,
  canDelete,
  duplicateTargets,
  duplicateNote,
  isDuplicating,
  onVerify,
  onDuplicate,
  onCopyIdentifier,
  onMakePrimary,
  onViewActivity,
  onDelete,
}: {
  integration: IIntegration;
  provider: IProviderConfig;
  canVerify: boolean;
  canDelete: boolean;
  /** The environments it can be copied into; empty hides "Duplicate to…". */
  duplicateTargets: DuplicateTarget[];
  duplicateNote: string;
  isDuplicating: boolean;
  onVerify: () => void;
  onDuplicate: (environment: IEnvironment) => void;
  onCopyIdentifier: () => void;
  /** Hidden when it's already primary, paused, or the member can't edit it. */
  onMakePrimary?: () => void;
  /** Hidden when the member can't read the activity feed. */
  onViewActivity?: () => void;
  onDelete: () => void;
}) {
  return (
    <SheetHeader className="border-stroke-soft flex-row items-center gap-2 space-y-0 border-b py-3 pl-4 pr-12">
      <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]">
        <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-[18px]" />
      </span>
      <SheetTitle className="text-label-md text-text-strong truncate">{integration.name}</SheetTitle>
      <Badge variant="stroke" color="gray" size="sm" className="shrink-0">
        {CHANNEL_LABELS[provider.channel]}
      </Badge>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <CompactButton icon={RiMoreFill} variant="ghost" size="md" className="ml-auto" aria-label="More actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={MENU_CLASS}>
          {canVerify && (
            <DropdownMenuItem className={ITEM_CLASS} onSelect={onVerify}>
              <RiFlashlightLine />
              Verify integration
            </DropdownMenuItem>
          )}
          {duplicateTargets.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                className={cn(
                  ITEM_CLASS,
                  // The design has no submenu chevron.
                  'data-[state=open]:text-text-strong data-[state=open]:bg-[#f4f4f5] [&>svg:last-child]:hidden'
                )}
                disabled={isDuplicating}
              >
                <RiClipboardLine />
                {isDuplicating ? 'Duplicating…' : 'Duplicate to…'}
              </DropdownMenuSubTrigger>
              <DuplicateSubmenu
                targets={duplicateTargets}
                note={duplicateNote}
                isDuplicating={isDuplicating}
                onDuplicate={onDuplicate}
              />
            </DropdownMenuSub>
          )}
          <DropdownMenuItem className={ITEM_CLASS} onSelect={onCopyIdentifier}>
            <RiStackLine />
            Copy identifier
          </DropdownMenuItem>
          {onMakePrimary && (
            <DropdownMenuItem className={ITEM_CLASS} onSelect={onMakePrimary}>
              <RiStarLine />
              Make primary
            </DropdownMenuItem>
          )}
          {onViewActivity && (
            <DropdownMenuItem className={ITEM_CLASS} onSelect={onViewActivity}>
              <RiBarChartBoxLine />
              View activity
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator className="bg-stroke-soft -mx-1 my-[3.5px]" />
              <DropdownMenuItem className={cn(ITEM_CLASS, 'text-error-base focus:text-error-base')} onSelect={onDelete}>
                <RiDeleteBin2Line />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="bg-stroke-soft h-4 w-px shrink-0" aria-hidden="true" />
    </SheetHeader>
  );
}

/** Environment name on the left and the last "Verify integration" result on the right. */
export function EnvironmentTitle({ environment, health }: { environment?: IEnvironment; health: IntegrationHealth }) {
  return (
    <div className="flex items-center gap-2">
      <EnvironmentBranchIcon environment={environment} size="sm" />
      <h3 className="text-label-md text-text-strong flex-1 truncate">{environment?.name ?? 'Environment'}</h3>
      <span className={cn('text-label-xs shrink-0', TONE_TEXT[health.tone])}>{health.label}</span>
    </div>
  );
}

/** Why the last "Verify integration" didn't pass, and what to do next. */
export function HealthBanner({ health }: { health: IntegrationHealth }) {
  if (health.tone !== 'error' && health.tone !== 'warning') return null;

  const nextStep =
    health.tone === 'error'
      ? 'Update the credentials, save, and verify again.'
      : 'Nothing was changed. Verify again in a few minutes.';

  return (
    <div className="bg-bg-weak border-stroke-weak flex items-stretch gap-3 rounded-lg border px-3 py-2.5">
      <span
        className={cn('w-1 shrink-0 rounded-full', health.tone === 'error' ? 'bg-error-base' : 'bg-warning-base')}
        aria-hidden="true"
      />
      <p className="text-label-xs text-text-strong">
        {health.message ? `${health.message} ` : ''}
        {nextStep}
      </p>
    </div>
  );
}

/** Link to the provider's setup guide, under the settings. */
export function ProviderGuideLink({ provider }: { provider: IProviderConfig }) {
  if (!provider.docReference) return null;

  return (
    <a
      href={provider.docReference}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-bg-weak border-stroke-weak text-label-xs text-text-strong hover:bg-bg-white flex items-stretch gap-3 rounded-lg border px-3 py-2.5 transition-colors"
    >
      <span className="w-1 shrink-0 rounded-full bg-[#717784]" aria-hidden="true" />
      {/* Chat providers connect through an app installed in the workspace; the rest are set up with credentials. */}
      {provider.channel === ChannelTypeEnum.CHAT
        ? `How to reinstall the Novu app in ${provider.displayName}`
        : `How to set up ${provider.displayName}`}
    </a>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-label-xs text-text-sub shrink-0">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

/** The left-hand panel: details of the integration, and the same integration in the other environments. */
export function IntegrationDetailsPanel({
  integration,
  provider,
  environments,
  currentEnvironmentId,
  matches,
  healthById,
  isSwitchDisabled,
  onSelect,
}: {
  integration: IIntegration;
  provider: IProviderConfig;
  environments: IEnvironment[];
  currentEnvironmentId?: string;
  /** The integrations with this identifier, one per environment. */
  matches: IIntegration[];
  healthById: Map<string, IntegrationHealth>;
  /** While a save or delete runs, the rows can't switch to another integration. */
  isSwitchDisabled?: boolean;
  onSelect: (integration: IIntegration) => void;
}) {
  const environmentOf = (item: IIntegration) => environments.find((env) => env._id === item._environmentId);
  const isLive = (item: IIntegration) => environmentOf(item)?.type === EnvironmentTypeEnum.PROD;
  const development = matches.filter((item) => !isLive(item));
  const live = matches.filter(isLive);

  const renderRow = (item: IIntegration) => {
    const environment = environmentOf(item);
    const isSelected = item._id === integration._id;
    const health = healthById.get(item._id);

    return (
      <button
        key={item._id}
        type="button"
        aria-current={isSelected ? 'true' : undefined}
        disabled={isSwitchDisabled && !isSelected}
        onClick={() => onSelect(item)}
        className={cn(
          'flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          isSelected ? cn('bg-bg-white', CARD_SHADOW) : 'hover:bg-bg-white/60'
        )}
      >
        <EnvironmentBranchIcon environment={environment} size="sm" />
        <span className="text-label-sm text-text-strong truncate">{environment?.name ?? 'Environment'}</span>
        {environment?._id === currentEnvironmentId && (
          <span className="text-code-xs font-code text-text-soft bg-bg-soft shrink-0 rounded px-1.5 py-0.5 uppercase">
            Current
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {health && <HealthDot tone={health.tone} />}
          <RiArrowRightSLine className="text-text-soft size-4" />
        </span>
      </button>
    );
  };

  return (
    <aside className="bg-bg-weak border-stroke-soft hidden w-[350px] shrink-0 flex-col overflow-y-auto border-r md:flex">
      <div className="border-stroke-soft border-b px-[18px] py-3">
        <DetailRow label="Integration">
          {provider.docReference ? (
            <a
              href={provider.docReference}
              target="_blank"
              rel="noopener noreferrer"
              className="text-label-xs text-text-strong inline-flex items-center gap-1.5"
            >
              <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-4" />
              {provider.displayName}
              <RiArrowRightUpLine className="text-text-soft size-3.5" />
            </a>
          ) : (
            <span className="text-label-xs text-text-strong">{provider.displayName}</span>
          )}
        </DetailRow>
        <DetailRow label="Channel">
          <span className="text-label-xs text-text-strong">{CHANNEL_LABELS[provider.channel]}</span>
        </DetailRow>
        <DetailRow label="Identifier">
          <span className="text-code-xs font-code text-text-soft">{integration.identifier}</span>
        </DetailRow>
        <DetailRow label="Created at">
          <span className="text-code-xs font-code text-text-soft">
            {formatUtc(getTimestamp(integration, 'createdAt'))}
          </span>
        </DetailRow>
        <DetailRow label="Last updated at">
          <span className="text-code-xs font-code text-text-soft">
            {formatUtc(getTimestamp(integration, 'updatedAt'))}
          </span>
        </DetailRow>
      </div>

      <div className="flex flex-col gap-2 px-4 py-4">
        <span className="text-code-xs font-code text-text-sub uppercase tracking-[-0.24px]">Environments</span>
        {development.map(renderRow)}
        {live.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-text-soft flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
                Live environments
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <RiInformationLine className="size-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Environments your users get notifications from.</TooltipContent>
                </Tooltip>
              </span>
              <span className="bg-stroke-soft h-px flex-1" />
            </div>
            {live.map(renderRow)}
          </>
        )}
      </div>
    </aside>
  );
}

/** Status on the left; Cancel and the save action on the right. */
export function ManageIntegrationFooter({
  health,
  formId,
  isSaving,
  canSave,
  isReadOnly,
  onCancel,
}: {
  health: IntegrationHealth;
  formId: string;
  isSaving: boolean;
  canSave: boolean;
  isReadOnly: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="bg-bg-weak border-stroke-soft flex items-center gap-2 border-t px-5 py-3">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <HealthDot tone={health.tone} />
        <span className="text-label-xs text-text-sub truncate">{health.label}</span>
      </span>
      <Button
        type="button"
        variant="secondary"
        mode="ghost"
        size="2xs"
        className="text-text-strong h-7 rounded-md px-2 text-[13px] leading-[1.1]"
        onClick={onCancel}
      >
        Cancel
      </Button>
      {!isReadOnly && (
        <Button
          type="submit"
          form={formId}
          variant="primary"
          mode="gradient"
          size="2xs"
          className="h-7 rounded-md px-2 text-[13px] leading-[1.1]"
          disabled={!canSave}
          isLoading={isSaving}
        >
          Save changes
        </Button>
      )}
    </div>
  );
}
