import {
  ApiServiceLevelEnum,
  CHANNELS_WITH_PRIMARY,
  ChannelTypeEnum,
  EnvironmentTypeEnum,
  FeatureNameEnum,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
  PermissionsEnum,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RiArrowRightSLine, RiLockStarLine, RiStarFill, RiStarLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { setAsPrimaryIntegration } from '@/api/integrations';
import { Badge } from '@/components/primitives/badge';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { QueryKeys } from '@/utils/query-keys';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { getMinimumTierForFeature } from '@/utils/upgrade-tier';
import { TableIntegration } from '../types';
import { IntegrationCardActions } from './integration-card-actions';
import { EnvironmentStack } from './integration-environment-filter';
import { ProviderIcon } from './provider-icon';
import { getDemoIntegrationTooltipMessage, isDemoIntegration } from './utils/helpers';

export type EnvironmentIntegration = {
  integration: IIntegration;
  environment: IEnvironment;
};

type CardStatus = 'active' | 'setup' | 'disabled';

type IntegrationGroupCardProps = {
  /** The same provider + name across one or more environments, development first. */
  items: EnvironmentIntegration[];
  provider: IProviderConfig;
  onClick: (item: TableIntegration) => void;
};

const STATUS_STYLES: Record<CardStatus, { badge: string; dot: string; label: string }> = {
  active: { badge: 'bg-success/10', dot: 'bg-success shadow-success/25', label: 'Active' },
  setup: { badge: 'bg-warning/10', dot: 'bg-warning shadow-warning/25', label: 'Setup not finished' },
  disabled: { badge: 'bg-neutral-alpha-100', dot: 'bg-text-soft shadow-text-soft/25', label: 'Inactive' },
};

function getCardStatus(items: EnvironmentIntegration[], integration: IIntegration): CardStatus {
  if (integration.channel === ChannelTypeEnum.IN_APP && !integration.connected) return 'setup';

  return items.some((item) => item.integration.active) ? 'active' : 'disabled';
}

/** Installed provider, grouped across the environments it is set up in. */
export function IntegrationGroupCard({ items, provider, onClick }: IntegrationGroupCardProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  // Open the integration in the sidebar's environment when the card has one there, otherwise the first.
  const selected = items.find((item) => item.environment._id === currentEnvironment?._id) ?? items[0];
  const { integration, environment } = selected;
  const status = getCardStatus(items, integration);
  const isDisabled = status === 'disabled';
  const supportsPrimary = !!integration.channel && CHANNELS_WITH_PRIMARY.includes(integration.channel);

  const openItem = (item: EnvironmentIntegration) => {
    const needsSetup = item.integration.channel === ChannelTypeEnum.IN_APP && !item.integration.connected;

    if (needsSetup && item.environment.type === EnvironmentTypeEnum.DEV) {
      navigate(`${ROUTES.INBOX_EMBED}?environmentId=${item.environment._id}`);

      return;
    }

    onClick({
      integrationId: item.integration._id ?? '',
      name: item.integration.name,
      identifier: item.integration.identifier,
      provider: provider.displayName,
      providerId: provider.id,
      channel: item.integration.channel ?? provider.channel,
      environment: item.environment.name,
      active: item.integration.active,
    });
  };
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // Cards still finishing setup go straight to setup; the rest ask which environment to manage.
  const handleOpen = () => (status === 'setup' ? openItem(selected) : setIsPickerOpen(true));

  return (
    // biome-ignore lint/a11y/useSemanticElements: the card holds its own buttons, so it can't be a <button>.
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'bg-bg-white group relative flex cursor-pointer flex-col overflow-hidden rounded-xl text-left transition-shadow',
        'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]',
        'hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_0_rgba(0,0,0,0.1)]'
      )}
      onClick={(event) => {
        // Menus, pickers and dialogs render in portals but still bubble React events here.
        if (event.target instanceof Node && !event.currentTarget.contains(event.target)) return;
        handleOpen();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      data-test-id={`integration-${integration._id}-row`}
    >
      <div className="flex flex-col gap-3 py-3.5 pl-3.5 pr-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'border-stroke-soft flex size-8 shrink-0 items-center justify-center rounded-lg border bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]',
              isDisabled && 'opacity-50'
            )}
          >
            <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-[19px]" />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className={cn('text-label-sm truncate', isDisabled ? 'text-text-sub' : 'text-text-strong')}>
              {integration.name}
            </span>
            <IntegrationTitleTags integration={integration} provider={provider} />
          </div>

          {supportsPrimary && <PrimaryStarButton items={items} provider={provider} name={integration.name} />}
          <IntegrationStatusBadge status={status} items={items} />
          <IntegrationCardActions items={items} selected={selected} onEdit={openItem} />
        </div>

        <div className="flex">
          <span className="bg-bg-weak border-stroke-soft text-text-sub max-w-full truncate rounded-md border px-1.5 py-[3px] font-mono text-[10px] leading-[15px] tracking-[-0.2px]">
            {integration.identifier}
          </span>
        </div>
      </div>

      <div className="bg-bg-weak border-stroke-soft mt-auto flex h-10 items-center justify-between border-t pl-3.5 pr-2.5">
        {status === 'setup' ? (
          <span className="text-label-xs text-text-strong flex items-center gap-0.5">
            Finish setup
            <RiArrowRightSLine className="size-3.5" />
          </span>
        ) : (
          <div className={cn('flex min-w-0 items-center gap-2', isDisabled && '[&>*:first-child]:opacity-50')}>
            <EnvironmentStack environments={items.map((item) => item.environment)} />
            <span className="text-label-xs text-text-sub truncate">
              {items.length === 1 ? environment.name : `${items.length} environments`}
            </span>
          </div>
        )}

        {status !== 'setup' && (
          <ManageEnvironmentPicker
            items={items}
            onSelect={openItem}
            open={isPickerOpen}
            onOpenChange={setIsPickerOpen}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Lists every environment in the organization: the ones this integration is set up in open it,
 * the rest show as not connected.
 */
function ManageEnvironmentPicker({
  items,
  onSelect,
  open: isOpen,
  onOpenChange: setIsOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: EnvironmentIntegration[];
  onSelect: (item: EnvironmentIntegration) => void;
}) {
  const { environments = [] } = useEnvironment();
  const byEnvironment = new Map(items.map((item) => [item.environment._id, item]));
  const rows = [...environments].sort((a, b) => Number(byEnvironment.has(b._id)) - Number(byEnvironment.has(a._id)));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-label-xs text-text-strong flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          Manage
          <RiArrowRightSLine className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[260px] p-0"
        // Portaled content still bubbles React events to the card; keep them from opening it.
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="text-text-soft flex items-start px-3 pb-2 pt-2.5 font-mono text-xs font-medium leading-4 tracking-[-0.24px]">
          <span className="flex-1">ENVIRONMENTS</span>
          <span>
            {items.length} of {environments.length}
          </span>
        </div>
        <div className="flex flex-col px-1 pb-1">
          {rows.map((environment) => {
            const item = byEnvironment.get(environment._id);

            return (
              <button
                key={environment._id}
                type="button"
                disabled={!item}
                className="hover:bg-bg-weak focus-visible:bg-bg-weak flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-left outline-hidden disabled:cursor-default disabled:hover:bg-transparent"
                onClick={() => {
                  if (!item) return;
                  setIsOpen(false);
                  onSelect(item);
                }}
              >
                <EnvironmentBranchIcon
                  size="xs"
                  environment={environment}
                  className={cn('rounded-[3px]', !item && 'opacity-50')}
                />
                <span className={cn('text-label-xs flex-1 truncate', item ? 'text-text-strong' : 'text-text-soft')}>
                  {environment.name}
                </span>
                {item ? (
                  <span
                    className={cn(
                      'text-paragraph-xs flex shrink-0 items-center gap-2',
                      item.integration.active ? 'text-success' : 'text-text-soft'
                    )}
                  >
                    <span
                      className={cn('size-1.5 rounded-full', item.integration.active ? 'bg-success' : 'bg-text-soft')}
                    />
                    {item.integration.active ? 'Active' : 'Inactive'}
                  </span>
                ) : (
                  <span className="text-paragraph-xs text-text-soft shrink-0">Not connected</span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Demo badge, routing-rules marker and the Inbox branding upgrade lock, next to the name. */
function IntegrationTitleTags({ integration, provider }: { integration: IIntegration; provider: IProviderConfig }) {
  const { subscription } = useFetchSubscription();
  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;
  const hasRules =
    (integration.rules && Object.keys(integration.rules).length > 0) ||
    (integration.conditions && integration.conditions.length > 0);

  return (
    <>
      {isDemoIntegration(provider.id) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">
              <Badge variant="lighter" color="yellow" size="sm">
                DEMO
              </Badge>
            </span>
          </TooltipTrigger>
          <TooltipContent>{getDemoIntegrationTooltipMessage(provider.id, provider.channel)}</TooltipContent>
        </Tooltip>
      )}
      {hasRules && <span className="text-text-soft shrink-0 text-[10px] leading-none">if</span>}
      {integration.channel === ChannelTypeEnum.IN_APP && isFreePlan && (
        <UpgradeCTATooltip
          description="Remove the Novu branding and extend notification snooze beyond 24 hours in your Inbox component."
          requiredTier={getMinimumTierForFeature(FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN)}
          utmSource="in-app-upgrade-tooltip"
          side="right"
          align="center"
        >
          <RiLockStarLine className="text-warning size-4 shrink-0" />
        </UpgradeCTATooltip>
      )}
    </>
  );
}

/**
 * Filled when the integration is primary in every environment on the card; clicking makes it
 * primary in the ones where it isn't. The environment filter already narrows `items`.
 */
function PrimaryStarButton({
  items,
  provider,
  name,
}: {
  items: EnvironmentIntegration[];
  provider: IProviderConfig;
  name: string;
}) {
  const has = useHasPermission();
  const queryClient = useQueryClient();
  const canSetPrimary = has({ permission: PermissionsEnum.INTEGRATION_WRITE });
  const isPrimary = items.every((item) => item.integration.primary);

  const { mutate: setPrimary, isPending } = useMutation({
    mutationFn: () =>
      Promise.all(
        items
          .filter((item) => !item.integration.primary)
          .map((item) => setAsPrimaryIntegration(item.integration._id, item.environment))
      ),
    onSuccess: () => showSuccessToast(`${name} is now the primary ${provider.channel} integration.`),
    onError: () => showErrorToast(`Couldn't make ${name} the primary integration.`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] }),
  });

  let tooltip = 'Set as primary';
  if (isPrimary) tooltip = `Primary ${provider.channel} integration`;
  else if (!canSetPrimary) tooltip = "Your role can't change the primary integration";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center rounded-md disabled:cursor-default"
          disabled={isPrimary || !canSetPrimary || isPending}
          aria-label={isPrimary ? 'Primary integration' : 'Set as primary integration'}
          onClick={(event) => {
            event.stopPropagation();
            setPrimary();
          }}
        >
          {isPrimary ? (
            <RiStarFill className="size-4 text-[#f6b51e]" />
          ) : (
            <RiStarLine className="text-text-soft hover:text-text-sub size-4 transition-colors" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function IntegrationStatusBadge({ status, items }: { status: CardStatus; items: EnvironmentIntegration[] }) {
  const style = STATUS_STYLES[status];
  const tooltip =
    items.length > 1 && status !== 'setup'
      ? items.map((item) => `${item.environment.name}: ${item.integration.active ? 'Active' : 'Inactive'}`).join(' · ')
      : style.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', style.badge)}
          role="img"
          aria-label={style.label}
        >
          <span className={cn('size-1.5 rounded-full shadow-[0_0_0_3px]', style.dot)} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
