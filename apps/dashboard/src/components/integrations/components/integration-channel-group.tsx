import {
  ChannelTypeEnum,
  EnvironmentTypeEnum,
  IEnvironment,
  IIntegration,
  IProviderConfig,
  PermissionsEnum,
} from '@novu/shared';
import { type ComponentType, useMemo, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { PermissionButton } from '@/components/primitives/permission-button';
import { CHANNEL_TYPE_TO_STRING } from '@/utils/channels';
import { StepTypeEnum } from '@/utils/enums';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { TableIntegration } from '../types';
import { INTEGRATION_CHANNELS } from '../utils/channels';
import { IntegrationCard } from './integration-card';
import { type EnvironmentIntegration, IntegrationGroupCard } from './integration-group-card';
import { ProviderIcon } from './provider-icon';

/** Two rows of four; the rest sit behind "Show N more". */
const COLLAPSED_CARD_COUNT = 8;
const PREVIEW_LOGO_COUNT = 3;

type IntegrationChannelGroupVariant = 'default' | 'connectSheet';

type IntegrationChannelGroupProps = {
  channel: ChannelTypeEnum;
  integrations: IIntegration[];
  providers: IProviderConfig[];
  environments?: IEnvironment[];
  onItemClick: (item: TableIntegration) => void;
  excludeIntegrationIds?: string[];
  variant?: IntegrationChannelGroupVariant;
  /** Show only cards connected in this environment; omitted shows every card. */
  environmentId?: string;
};

export function IntegrationChannelGroup({
  channel,
  integrations,
  providers,
  environments,
  onItemClick,
  excludeIntegrationIds,
  variant = 'default',
  environmentId,
}: IntegrationChannelGroupProps) {
  const exclude = excludeIntegrationIds ? new Set(excludeIntegrationIds) : null;
  const visibleIntegrations = exclude
    ? integrations.filter((integration) => !exclude.has(integration._id))
    : integrations;

  // Each card keeps every environment it is connected in (for the picker and menu); `filtered` is
  // what the environment filter shows (status, star, footer).
  const groups = useMemo(
    () =>
      groupAcrossEnvironments(visibleIntegrations, environments ?? []).flatMap((items) => {
        const filtered = environmentId ? items.filter((item) => item.environment._id === environmentId) : items;

        return filtered.length > 0 ? [{ items, filtered }] : [];
      }),
    [visibleIntegrations, environments, environmentId]
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const isCollapsible = groups.length > COLLAPSED_CARD_COUNT;
  const shownGroups = isCollapsible && !isExpanded ? groups.slice(0, COLLAPSED_CARD_COUNT) : groups;

  if (visibleIntegrations.length === 0 || (variant === 'default' && groups.length === 0)) {
    return null;
  }

  return (
    <div className={variant === 'connectSheet' ? 'space-y-3' : 'space-y-4'}>
      {variant === 'connectSheet' ? (
        <h2 className="text-text-soft text-[11px] font-semibold uppercase tracking-wider">
          {CHANNEL_TYPE_TO_STRING[channel]}
        </h2>
      ) : (
        <ChannelSectionHeader channel={channel} count={groups.length} />
      )}
      <div
        className={cn(
          variant === 'connectSheet'
            ? 'flex flex-wrap gap-4 p-1.5'
            : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {variant === 'connectSheet'
          ? visibleIntegrations.map((integration) => {
              const provider = providers.find((p) => p.id === integration.providerId);
              if (!provider) return null;

              const environment = environments?.find((env) => env._id === integration._environmentId);
              if (!environment) return null;

              return (
                <IntegrationCard
                  key={integration._id}
                  integration={integration}
                  provider={provider}
                  environment={environment}
                  onClick={onItemClick}
                  variant={variant}
                />
              );
            })
          : shownGroups.map(({ items, filtered }) => {
              const provider = providers.find((p) => p.id === items[0].integration.providerId);
              if (!provider) return null;

              return (
                <IntegrationGroupCard
                  key={items[0].integration._id}
                  items={items}
                  filteredItems={filtered}
                  provider={provider}
                  onClick={onItemClick}
                />
              );
            })}
      </div>
      {variant === 'default' && isCollapsible && (
        <ShowMoreDivider
          hiddenGroups={groups.slice(COLLAPSED_CARD_COUNT).map(({ items }) => items)}
          providers={providers}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((expanded) => !expanded)}
        />
      )}
    </div>
  );
}

function ShowMoreDivider({
  hiddenGroups,
  providers,
  isExpanded,
  onToggle,
}: {
  hiddenGroups: EnvironmentIntegration[][];
  providers: IProviderConfig[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const previews = hiddenGroups.slice(0, PREVIEW_LOGO_COUNT).flatMap((items) => {
    const provider = providers.find((p) => p.id === items[0].integration.providerId);

    return provider ? [{ key: items[0].integration._id, provider }] : [];
  });

  return (
    <div className="flex items-center gap-2">
      <div className="bg-stroke-soft h-px flex-1" />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="bg-bg-white text-label-xs text-text-strong flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[5px] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_0_rgba(0,0,0,0.1)]"
      >
        {!isExpanded &&
          previews.map(({ key, provider }) => (
            <span
              key={key}
              className="border-stroke-soft flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]"
            >
              <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-2.5" />
            </span>
          ))}
        {isExpanded ? 'Show less' : `Show ${hiddenGroups.length} more`}
        {isExpanded ? <RiArrowUpSLine className="size-[15px]" /> : <RiArrowDownSLine className="size-[15px]" />}
      </button>
      <div className="bg-stroke-soft h-px flex-1" />
    </div>
  );
}

const ENVIRONMENT_TYPE_ORDER: Record<string, number> = {
  [EnvironmentTypeEnum.DEV]: 0,
  [EnvironmentTypeEnum.PROD]: 1,
};

/**
 * One card per provider + name: the same integration set up in several environments
 * shows once, with its environments listed development first. A card holds at most one
 * integration per environment; same-name duplicates in one environment get cards of their own.
 */
function groupAcrossEnvironments(integrations: IIntegration[], environments: IEnvironment[]) {
  const environmentIndex = new Map(environments.map((env, index) => [env._id, index]));
  // Each provider + name holds a list of cards, so duplicates never share a key with another name.
  const cardsByName = new Map<string, EnvironmentIntegration[][]>();

  for (const integration of integrations) {
    const environment = environments.find((env) => env._id === integration._environmentId);
    if (!environment) continue;

    const key = JSON.stringify([integration.providerId, integration.name]);
    const cards = cardsByName.get(key) ?? [];
    const card = cards.find((items) => !items.some((item) => item.environment._id === environment._id));

    if (card) {
      card.push({ integration, environment });
    } else {
      cards.push([{ integration, environment }]);
    }

    cardsByName.set(key, cards);
  }

  const groups = [...cardsByName.values()].flat();

  for (const group of groups) {
    group.sort(
      (a, b) =>
        (ENVIRONMENT_TYPE_ORDER[a.environment.type ?? ''] ?? 2) -
          (ENVIRONMENT_TYPE_ORDER[b.environment.type ?? ''] ?? 2) ||
        (environmentIndex.get(a.environment._id) ?? 0) - (environmentIndex.get(b.environment._id) ?? 0)
    );
  }

  return groups;
}

/** Phone glyph from the integration store design (notch on top, home bar below). */
function PushChannelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="4 4 12 12" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.35 4.5H11.65C12.0743 4.5 12.4813 4.66857 12.7814 4.96863C13.0814 5.26869 13.25 5.67565 13.25 6.1V13.9C13.25 14.3243 13.0814 14.7313 12.7814 15.0314C12.4813 15.3314 12.0743 15.5 11.65 15.5H8.35C7.92565 15.5 7.51869 15.3314 7.21863 15.0314C6.91857 14.7313 6.75 14.3243 6.75 13.9V6.1C6.75 5.67565 6.91857 5.26869 7.21863 4.96863C7.51869 4.66857 7.92565 4.5 8.35 4.5ZM9.2 5.7H10.8C10.9061 5.7 11.0078 5.74214 11.0828 5.81716C11.1579 5.89217 11.2 5.99391 11.2 6.1C11.2 6.20609 11.1579 6.30783 11.0828 6.38284C11.0078 6.45786 10.9061 6.5 10.8 6.5H9.2C9.09391 6.5 8.99217 6.45786 8.91716 6.38284C8.84214 6.30783 8.8 6.20609 8.8 6.1C8.8 5.99391 8.84214 5.89217 8.91716 5.81716C8.99217 5.74214 9.09391 5.7 9.2 5.7ZM8.9 13.5H11.1C11.2061 13.5 11.3078 13.5421 11.3828 13.6172C11.4579 13.6922 11.5 13.7939 11.5 13.9C11.5 14.0061 11.4579 14.1078 11.3828 14.1828C11.3078 14.2579 11.2061 14.3 11.1 14.3H8.9C8.79391 14.3 8.69217 14.2579 8.61716 14.1828C8.54214 14.1078 8.5 14.0061 8.5 13.9C8.5 13.7939 8.54214 13.6922 8.61716 13.6172C8.69217 13.5421 8.79391 13.5 8.9 13.5Z"
      />
    </svg>
  );
}

/** Glyphs the integration store draws differently from the workflow step icons. */
const SECTION_ICON_OVERRIDES: Partial<Record<ChannelTypeEnum, ComponentType<{ className?: string }>>> = {
  [ChannelTypeEnum.PUSH]: PushChannelIcon,
};

// Glyph colours come from the integration store design; they differ from the workflow step palette.
const SECTION_LABELS: Record<ChannelTypeEnum, { title: string; noun: string; step: StepTypeEnum; color: string }> = {
  [ChannelTypeEnum.IN_APP]: { title: 'In-app', noun: 'in-app', step: StepTypeEnum.IN_APP, color: 'text-[#12B5A5]' },
  [ChannelTypeEnum.EMAIL]: { title: 'Email', noun: 'email', step: StepTypeEnum.EMAIL, color: 'text-[#335CFF]' },
  [ChannelTypeEnum.SMS]: { title: 'SMS', noun: 'SMS', step: StepTypeEnum.SMS, color: 'text-[#F2642D]' },
  [ChannelTypeEnum.CHAT]: { title: 'Chat', noun: 'chat', step: StepTypeEnum.CHAT, color: 'text-feature' },
  [ChannelTypeEnum.PUSH]: { title: 'Push', noun: 'push', step: StepTypeEnum.PUSH, color: 'text-[#0EA5E9]' },
  [ChannelTypeEnum.TOOL]: { title: 'Tool', noun: 'tool', step: StepTypeEnum.TOOL, color: 'text-warning' },
};

/** Channel icon, name and card count, with a shortcut to add another provider for the channel. */
function ChannelSectionHeader({ channel, count }: { channel: ChannelTypeEnum; count: number }) {
  const navigate = useNavigate();
  const { title, noun, step, color } = SECTION_LABELS[channel];
  const Icon = SECTION_ICON_OVERRIDES[channel] ?? STEP_TYPE_TO_ICON[step];
  // In-app has a single provider (Novu Inbox), so it has nothing to add.
  const canAddProvider = (INTEGRATION_CHANNELS as readonly ChannelTypeEnum[]).includes(channel);

  return (
    <div className="flex h-7 items-center gap-2">
      {Icon && (
        <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]">
          <Icon
            className={cn(
              'size-3 [filter:drop-shadow(0_0_0.5px_white)_drop-shadow(0_0_0.5px_white)_drop-shadow(0_0_0.25px_white)_drop-shadow(0_0.5px_0.5px_rgba(14,18,27,0.16))]',
              color
            )}
          />
        </span>
      )}
      <h2 className="text-label-sm text-text-strong">{title}</h2>
      <span className="text-paragraph-sm text-text-soft">{count}</span>
      {canAddProvider && (
        <PermissionButton
          permission={PermissionsEnum.INTEGRATION_WRITE}
          variant="secondary"
          mode="ghost"
          size="xs"
          leadingIcon={RiAddLine}
          className="ml-auto"
          onClick={() => navigate(`${ROUTES.INTEGRATIONS_CONNECT}?channel=${channel}`)}
        >
          Add {noun} provider
        </PermissionButton>
      )}
    </div>
  );
}
