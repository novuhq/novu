import {
  ApiServiceLevelEnum,
  CHANNELS_WITH_PRIMARY,
  ChannelTypeEnum,
  EnvironmentTypeEnum,
  FeatureNameEnum,
  type IIntegration,
  type IProviderConfig,
  PermissionsEnum,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RiArrowRightSLine, RiLockStarLine, RiStarFill, RiStarLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { setAsPrimaryIntegration } from '@/api/integrations';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Badge } from '@/components/primitives/badge';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { formatDateSimple } from '@/utils/format-date';
import { QueryKeys } from '@/utils/query-keys';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { getMinimumTierForFeature } from '@/utils/upgrade-tier';
import { TableIntegration } from '../types';
import { getHealthReason, isIntegrationFailing } from '../utils/integration-health';
import { IntegrationCardActions } from './integration-card-actions';
import { ProviderIcon } from './provider-icon';
import {
  CHANNEL_LABELS,
  getDemoIntegrationTooltipMessage,
  hasRoutingConditions,
  isDemoIntegration,
} from './utils/helpers';

type CardStatus = 'active' | 'setup' | 'inactive' | 'error';

// Tinted halo + dot, per the design's status/dot.
const STATUS_DOT: Record<CardStatus, { halo: string; dot: string }> = {
  active: { halo: 'bg-success/15', dot: 'bg-success' },
  setup: { halo: 'bg-warning/15', dot: 'bg-warning' },
  inactive: { halo: 'bg-neutral-alpha-100', dot: 'bg-text-soft' },
  error: { halo: 'bg-error-base/15', dot: 'bg-error-base' },
};

function getCardStatus(integration: IIntegration): CardStatus {
  if (integration.channel === ChannelTypeEnum.IN_APP && !integration.connected) return 'setup';

  if (!integration.active) return 'inactive';

  return isIntegrationFailing(integration) ? 'error' : 'active';
}

/** The API returns the stored `updatedAt`, but the shared type doesn't declare it. */
function getUpdatedAt(integration: IIntegration): string | undefined {
  const { updatedAt } = integration as IIntegration & { updatedAt?: unknown };

  return typeof updatedAt === 'string' ? updatedAt : undefined;
}

type IntegrationStoreCardProps = {
  integration: IIntegration;
  provider: IProviderConfig;
  onClick: (item: TableIntegration) => void;
};

/** One installed integration in the current environment. */
export function IntegrationStoreCard({ integration, provider, onClick }: IntegrationStoreCardProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const status = getCardStatus(integration);
  const supportsPrimary = !!integration.channel && CHANNELS_WITH_PRIMARY.includes(integration.channel);
  const channel = integration.channel ?? provider.channel;

  const open = () => {
    if (status === 'setup' && currentEnvironment?.type === EnvironmentTypeEnum.DEV) {
      navigate(`${ROUTES.INBOX_EMBED}?environmentId=${currentEnvironment._id}`);

      return;
    }

    onClick({
      integrationId: integration._id ?? '',
      name: integration.name,
      identifier: integration.identifier,
      provider: provider.displayName,
      providerId: provider.id,
      channel,
      environment: currentEnvironment?.name ?? '',
      active: integration.active,
    });
  };

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
        // Menus and dialogs render in portals but still bubble React events here.
        if (event.target instanceof Node && !event.currentTarget.contains(event.target)) return;
        open();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
      data-test-id={`integration-${integration._id}-row`}
    >
      <div className="flex flex-col gap-3 py-3.5 pl-3.5 pr-3">
        <div className="flex items-start gap-3">
          <div className="border-stroke-soft flex size-8 shrink-0 items-center justify-center rounded-lg border bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]">
            <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-[19px]" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn('text-label-sm truncate', status === 'inactive' ? 'text-text-sub' : 'text-text-strong')}
              >
                {integration.name}
              </span>
              <IntegrationTitleTags integration={integration} provider={provider} />
            </div>
            <span className="text-label-xs text-text-sub truncate opacity-85">
              {CHANNEL_LABELS[channel]} · {provider.displayName}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {supportsPrimary && <PrimaryStarButton integration={integration} provider={provider} />}
            <IntegrationCardActions integration={integration} onEdit={open} />
          </div>
        </div>

        <div className="flex">
          <span className="bg-bg-weak border-stroke-soft text-text-sub max-w-full truncate rounded-md border px-1.5 py-[3px] font-mono text-[10px] leading-[15px] tracking-[-0.2px]">
            {integration.identifier}
          </span>
        </div>
      </div>

      <CardFooter status={status} integration={integration} />
    </div>
  );
}

const FOOTER_ACTIONS: Record<Exclude<CardStatus, 'inactive'>, string> = {
  active: 'Manage',
  setup: 'Finish setup',
  error: 'Reconnect',
};

/** Status dot and line on the left; the one action that fits the status on the right. */
function CardFooter({ status, integration }: { status: CardStatus; integration: IIntegration }) {
  const updatedAt = getUpdatedAt(integration);
  const updatedLabel = updatedAt ? `Updated ${formatDateSimple(updatedAt)}` : undefined;
  let label = 'Setup incomplete';
  if (status === 'inactive') label = 'Paused';
  else if (status === 'error') label = getHealthReason(integration);
  else if (status === 'active') label = updatedLabel ?? 'Active';

  return (
    <div className="bg-bg-weak border-stroke-soft mt-auto flex h-10 items-center justify-between gap-2 border-t pl-3 pr-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <StatusDot status={status} />
        <span className={cn('text-label-xs truncate', status === 'error' ? 'text-error-base' : 'text-text-sub')}>
          {label}
        </span>
      </div>
      {status === 'inactive' ? (
        // Paused keeps the "Updated …" meta on the right, quieter, in place of an action.
        updatedLabel && <span className="text-label-xs text-text-sub shrink-0 opacity-70">{updatedLabel}</span>
      ) : (
        <span
          className={cn(
            'text-label-xs flex shrink-0 items-center gap-0.5',
            status === 'error' ? 'text-error-base' : 'text-text-strong',
            // "Finish setup" and "Reconnect" are fixes, so they always show; "Manage" only on hover.
            status === 'active' &&
              'opacity-0 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100'
          )}
        >
          {FOOTER_ACTIONS[status]}
          <RiArrowRightSLine className="size-3.5" />
        </span>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: CardStatus }) {
  const style = STATUS_DOT[status];

  return (
    <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full', style.halo)}>
      <span className={cn('size-1.5 rounded-full', style.dot)} />
    </span>
  );
}

/** Demo badge, routing-rules marker and the Inbox branding upgrade lock, next to the name. */
function IntegrationTitleTags({ integration, provider }: { integration: IIntegration; provider: IProviderConfig }) {
  const { subscription } = useFetchSubscription();
  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;

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
      {hasRoutingConditions(integration) && (
        <span className="text-text-soft shrink-0 text-[10px] leading-none">if</span>
      )}
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

/** Filled for the primary integration; clicking makes this one primary (after confirming if it has conditions). */
function PrimaryStarButton({ integration, provider }: { integration: IIntegration; provider: IProviderConfig }) {
  const has = useHasPermission();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const canSetPrimary = has({ permission: PermissionsEnum.INTEGRATION_WRITE });
  const isPrimary = integration.primary;

  const { mutate: setPrimary, isPending } = useMutation({
    mutationFn: async () => {
      if (!currentEnvironment) throw new Error('No environment selected');

      return setAsPrimaryIntegration(integration._id, currentEnvironment);
    },
    onSuccess: () => showSuccessToast(`${integration.name} is now the primary ${provider.channel} integration.`),
    onError: () => showErrorToast(`Couldn't make ${integration.name} the primary integration.`),
    onSettled: () => {
      setIsConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
    },
  });

  let tooltip = 'Set as primary';
  if (isPrimary) tooltip = `Primary ${provider.channel} integration`;
  else if (!canSetPrimary) tooltip = "Your role can't change the primary integration";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex size-6 shrink-0 items-center justify-center rounded-md disabled:cursor-default"
            disabled={isPrimary || !canSetPrimary || isPending || !currentEnvironment}
            aria-label={isPrimary ? 'Primary integration' : 'Set as primary integration'}
            onClick={(event) => {
              event.stopPropagation();
              if (hasRoutingConditions(integration)) setIsConfirmOpen(true);
              else setPrimary();
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
      <ConfirmationModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => setPrimary()}
        isLoading={isPending}
        title="Remove conditions?"
        description="A primary integration cannot have conditions. Making this integration primary will remove its conditions."
        confirmButtonText="Remove conditions"
      />
    </>
  );
}
