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
import { RiArrowRightSLine, RiLockStarLine, RiStarFill, RiStarLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { formatDateSimple } from '@/utils/format-date';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { getMinimumTierForFeature } from '@/utils/upgrade-tier';
import { TableIntegration } from '../types';
import { useMakePrimary } from './hooks/use-make-primary';
import { IntegrationCardActions } from './integration-card-actions';
import { MakePrimaryModal } from './modals/make-primary-modal';
import { ProviderIcon } from './provider-icon';
import { StatusDot, type StatusTone } from './status-dot';
import {
  CHANNEL_LABELS,
  channelNoun,
  getDemoIntegrationTooltipMessage,
  getIntegrationTimestamp,
  hasRoutingConditions,
  isDemoIntegration,
} from './utils/helpers';
import { CARD_HOVER_SHADOW, CARD_SHADOW } from './utils/store-styles';

type CardStatus = 'active' | 'setup' | 'inactive';

// The card's status as a dot colour.
const STATUS_TONE: Record<CardStatus, StatusTone> = {
  active: 'success',
  setup: 'warning',
  inactive: 'neutral',
};

function getCardStatus(integration: IIntegration): CardStatus {
  if (integration.channel === ChannelTypeEnum.IN_APP && !integration.connected) return 'setup';

  return integration.active ? 'active' : 'inactive';
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
        CARD_SHADOW,
        CARD_HOVER_SHADOW
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
      data-test-id={`integration-${integration._id}-card`}
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
            {supportsPrimary && <PrimaryStarButton integration={integration} />}
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

/** Status dot and line on the left; the one action that fits the status on the right. */
function CardFooter({ status, integration }: { status: CardStatus; integration: IIntegration }) {
  const updatedAt = getIntegrationTimestamp(integration, 'updatedAt');
  const updatedLabel = updatedAt ? `Updated ${formatDateSimple(updatedAt)}` : undefined;
  let label = 'Setup incomplete';
  if (status === 'inactive') label = 'Paused';
  else if (status === 'active') label = updatedLabel ?? 'Active';

  return (
    <div className="bg-bg-weak border-stroke-soft mt-auto flex h-10 items-center justify-between gap-2 border-t pl-3 pr-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <StatusDot tone={STATUS_TONE[status]} />
        <span className="text-label-xs text-text-sub truncate">{label}</span>
      </div>
      {status === 'inactive' ? (
        // Paused keeps the "Updated …" meta on the right, quieter, in place of an action.
        updatedLabel && <span className="text-label-xs text-text-sub shrink-0 opacity-70">{updatedLabel}</span>
      ) : (
        <span
          className={cn(
            'text-label-xs text-text-strong flex shrink-0 items-center gap-0.5',
            // "Finish setup" is the fix, so it always shows; "Manage" only on hover.
            status === 'active' &&
              'opacity-0 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100'
          )}
        >
          {status === 'setup' ? 'Finish setup' : 'Manage'}
          <RiArrowRightSLine className="size-3.5" />
        </span>
      )}
    </div>
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

/** Filled for the primary integration; clicking asks to make this one primary, then does. */
function PrimaryStarButton({ integration }: { integration: IIntegration }) {
  const has = useHasPermission();
  const { currentEnvironment, environments = [] } = useEnvironment();
  const { integrations = [] } = useFetchIntegrations();
  const makePrimary = useMakePrimary(integration);
  // The primary this one takes over from, in the same environment and channel.
  const currentPrimary = integrations.find(
    (other) =>
      other.primary &&
      other._id !== integration._id &&
      other.channel === integration.channel &&
      other._environmentId === integration._environmentId
  );
  const canSetPrimary = has({ permission: PermissionsEnum.INTEGRATION_WRITE });
  const isPrimary = integration.primary;

  let tooltip = 'Set as primary';
  if (isPrimary) tooltip = `Primary ${channelNoun(integration.channel)} integration`;
  else if (!canSetPrimary) tooltip = "Your role can't change the primary integration";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex size-6 shrink-0 items-center justify-center rounded-md disabled:cursor-default"
            disabled={isPrimary || !canSetPrimary || makePrimary.isPending || !currentEnvironment}
            aria-label={isPrimary ? 'Primary integration' : 'Set as primary integration'}
            onClick={(event) => {
              event.stopPropagation();
              makePrimary.open();
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
      <MakePrimaryModal
        isOpen={makePrimary.isOpen}
        newPrimaryName={integration.name}
        currentPrimaryName={currentPrimary?.name}
        channel={integration.channel}
        environment={currentEnvironment}
        environments={environments}
        removesConditions={hasRoutingConditions(integration)}
        isLoading={makePrimary.isPending}
        centerOn="page"
        onCancel={makePrimary.close}
        onConfirm={makePrimary.confirm}
      />
    </>
  );
}
