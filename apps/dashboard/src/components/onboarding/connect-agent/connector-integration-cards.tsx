import { type IIntegration } from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import { RiArrowRightSLine, RiCheckboxCircleFill, RiFileCodeLine } from 'react-icons/ri';
import {
  getClaudeManagedAgentIntegrations,
  partitionClaudeManagedIntegrations,
} from '@/components/agents/connectors/claude-managed-integrations';
import {
  CONNECTOR_OPTIONS,
  type ConnectorId,
  type ConnectorOption,
} from '@/components/agents/connectors/connector-options';
import { AiSdkIcon } from '@/components/icons/ai-sdk';
import { AwsIcon } from '@/components/icons/aws';
import { ClaudeIcon } from '@/components/icons/claude';
import { LangChainIcon } from '@/components/icons/langchain';
import { NovuIcon } from '@/components/icons/novu-icon';
import { isDemoIntegration } from '@/components/integrations/components/utils/helpers';
import { Badge } from '@/components/primitives/badge';
import { useManagedAgentRuntimeEnabled } from '@/hooks/use-managed-agent-runtime-enabled';
import { cn } from '@/utils/ui';

const CARD_LABELS: Record<ConnectorId, string> = {
  'ai-sdk': 'Vercel AI SDK',
  langchain: 'Langchain',
  'custom-code': 'Custom code',
  claude: 'Claude Managed',
  'claude-aws': 'AWS Claude Managed',
  bedrock: 'AWS Bedrock',
};

type ConnectorIntegrationCardsProps = {
  selectedConnectorId?: ConnectorId;
  selectedIntegrationId?: string;
  integrations: IIntegration[] | undefined;
  disabled?: boolean;
  /** Test/Storybook override; production reads `IS_MANAGED_AGENT_RUNTIME_ENABLED`. */
  showManagedOptionsOverride?: boolean;
  onSelectConnector: (id: ConnectorId) => void;
  onSelectIntegration: (integration: IIntegration) => void;
  onRequestSetupCredentials: (option: ConnectorOption) => void;
};

type CardItem =
  | {
      kind: 'connector';
      option: ConnectorOption;
    }
  | {
      kind: 'demo';
      integration: IIntegration;
    };

function ConnectorCardIcon({ connectorId }: { connectorId: ConnectorId }) {
  switch (connectorId) {
    case 'ai-sdk':
      return (
        <div className="bg-bg-weak text-text-strong flex size-6 items-center justify-center rounded-full">
          <AiSdkIcon className="size-3.5" />
        </div>
      );
    case 'langchain':
      return (
        <div className="bg-bg-weak flex size-6 items-center justify-center rounded-full">
          <LangChainIcon className="size-4" />
        </div>
      );
    case 'custom-code':
      return (
        <div className="bg-bg-weak text-text-sub flex size-6 items-center justify-center rounded-full">
          <RiFileCodeLine className="size-4" />
        </div>
      );
    case 'claude':
      return (
        <div className="bg-primary-base/10 text-primary-base flex size-6 items-center justify-center rounded-full">
          <ClaudeIcon className="size-3.5" />
        </div>
      );
    case 'claude-aws':
    case 'bedrock':
      return (
        <div className="bg-bg-weak text-text-sub flex size-6 items-center justify-center rounded-full">
          <AwsIcon className="size-4" />
        </div>
      );
    default: {
      const _exhaustive: never = connectorId;

      return _exhaustive;
    }
  }
}

function DemoCardIcon() {
  return (
    <div
      className="flex size-6 items-center justify-center rounded-full text-white"
      style={{
        background: 'linear-gradient(135deg, #FF884D 0%, #E300BD 55%, #7B61FF 100%)',
      }}
    >
      <NovuIcon className="size-3.5" />
    </div>
  );
}

function ConnectPill() {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-[4px] text-text-sub',
        'shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea]'
      )}
      style={{
        backgroundImage:
          'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
      }}
      aria-hidden
    >
      <span className="px-1 text-label-xs font-medium leading-4">Connect</span>
      <RiArrowRightSLine className="size-3.5 shrink-0 text-text-soft" />
    </div>
  );
}

function ConnectorCard({
  label,
  icon,
  badge,
  isSelected,
  isDisabled,
  comingSoon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  isSelected: boolean;
  isDisabled?: boolean;
  comingSoon?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-pressed={isSelected || undefined}
      className={cn(
        'relative flex min-h-[92px] flex-col items-start gap-1.5 overflow-hidden rounded-[8px] border bg-bg-white p-2 text-left shadow-xs transition-colors',
        isSelected ? 'border-stroke-strong' : 'border-stroke-weak hover:border-stroke-soft',
        comingSoon && 'cursor-not-allowed opacity-60',
        isDisabled && !comingSoon && 'cursor-default opacity-60',
        !isDisabled && 'cursor-pointer!'
      )}
    >
      <div className="flex w-full items-start justify-between gap-1">
        <div className="flex size-6 shrink-0 items-center justify-center">{icon}</div>
        {isSelected ? (
          <RiCheckboxCircleFill className="text-success-base size-4 shrink-0" aria-hidden />
        ) : (
          (badge ?? null)
        )}
      </div>
      <span className="text-label-xs text-text-sub min-w-0 font-medium leading-4">{label}</span>
      <div className="mt-auto h-7 w-full shrink-0">{isSelected || comingSoon ? null : <ConnectPill />}</div>
    </button>
  );
}

export function ConnectorIntegrationCards({
  selectedConnectorId,
  selectedIntegrationId,
  integrations,
  disabled,
  showManagedOptionsOverride,
  onSelectConnector,
  onSelectIntegration,
  onRequestSetupCredentials,
}: ConnectorIntegrationCardsProps) {
  const isManagedRuntimeEnabled = useManagedAgentRuntimeEnabled(showManagedOptionsOverride);

  const demoIntegration = useMemo(() => {
    const allClaude = getClaudeManagedAgentIntegrations(integrations);
    const { demoIntegrations } = partitionClaudeManagedIntegrations(allClaude);

    return demoIntegrations[0];
  }, [integrations]);

  const selectedIntegration = useMemo(
    () => (integrations ?? []).find((integration) => integration._id === selectedIntegrationId),
    [integrations, selectedIntegrationId]
  );
  const isDemoSelected = Boolean(selectedIntegration && isDemoIntegration(selectedIntegration.providerId));

  const items = useMemo((): CardItem[] => {
    const customOptions = CONNECTOR_OPTIONS.filter((option) => option.group === 'custom');
    const externalOptions = isManagedRuntimeEnabled
      ? CONNECTOR_OPTIONS.filter((option) => option.group === 'external')
      : [];

    const next: CardItem[] = customOptions.map((option) => ({ kind: 'connector', option }));

    if (demoIntegration) {
      next.push({ kind: 'demo', integration: demoIntegration });
    }

    for (const option of externalOptions) {
      next.push({ kind: 'connector', option });
    }

    return next;
  }, [demoIntegration, isManagedRuntimeEnabled]);

  function handleConnectorClick(option: ConnectorOption) {
    if (disabled || option.comingSoon || !option.runtime) return;

    onSelectConnector(option.id);

    if (!option.providerId) return;

    const matching = getClaudeManagedAgentIntegrations(integrations, option.providerId);
    const { userIntegrations } = partitionClaudeManagedIntegrations(matching);

    if (userIntegrations.length > 0) {
      onSelectIntegration(userIntegrations[0]);

      return;
    }

    onRequestSetupCredentials(option);
  }

  function handleDemoClick(integration: IIntegration) {
    if (disabled) return;

    const connectorId: ConnectorId = 'claude';
    onSelectConnector(connectorId);
    onSelectIntegration(integration);
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        if (item.kind === 'demo') {
          return (
            <ConnectorCard
              key={`demo-${item.integration._id}`}
              label="Demo agent"
              icon={<DemoCardIcon />}
              badge={
                <Badge color="yellow" variant="lighter" size="sm" className="shrink-0 rounded-sm uppercase">
                  DEMO
                </Badge>
              }
              isSelected={isDemoSelected}
              isDisabled={disabled}
              onClick={() => handleDemoClick(item.integration)}
            />
          );
        }

        const { option } = item;
        const isComingSoon = option.comingSoon || !option.runtime;
        const isSelected = !isDemoSelected && selectedConnectorId === option.id && !isComingSoon;

        return (
          <ConnectorCard
            key={option.id}
            label={CARD_LABELS[option.id]}
            icon={<ConnectorCardIcon connectorId={option.id} />}
            badge={
              isComingSoon ? (
                <Badge color="gray" variant="lighter" size="sm" className="shrink-0 rounded-sm uppercase">
                  Coming soon
                </Badge>
              ) : undefined
            }
            isSelected={isSelected}
            isDisabled={disabled || isComingSoon}
            comingSoon={isComingSoon}
            onClick={() => handleConnectorClick(option)}
          />
        );
      })}
    </div>
  );
}
