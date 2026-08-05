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
      return <AiSdkIcon className="text-text-strong h-4 w-[18.5px]" />;
    case 'langchain':
      return <LangChainIcon className="size-[18px]" />;
    case 'custom-code':
      return <RiFileCodeLine className="text-text-sub size-4" />;
    case 'claude':
      return <ClaudeIcon className="text-primary-base size-5" />;
    case 'claude-aws':
    case 'bedrock':
      return <AwsIcon className="size-6" />;
    default: {
      const _exhaustive: never = connectorId;

      return _exhaustive;
    }
  }
}

function DemoCardIcon() {
  return (
    <div
      className="flex size-[18px] items-center justify-center rounded-full text-white"
      style={{
        background: 'linear-gradient(135deg, #FF884D 0%, #E300BD 55%, #7B61FF 100%)',
      }}
    >
      <NovuIcon className="size-2.5" />
    </div>
  );
}

function ConnectAction() {
  return (
    <div className="text-text-sub flex items-center justify-center py-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
      <span className="px-0.5 text-label-xs font-medium leading-4">Connect</span>
      <RiArrowRightSLine className="size-4 shrink-0" aria-hidden />
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
        'group bg-bg-white border-stroke-weak relative flex h-16 w-[150px] flex-col items-start gap-2 overflow-hidden rounded-lg border p-2 text-left shadow-xs transition-colors',
        'hover:border-stroke-soft focus-visible:border-stroke-soft focus-visible:outline-none',
        isSelected && 'border-stroke-strong',
        comingSoon && 'cursor-not-allowed',
        isDisabled && !comingSoon && 'cursor-default opacity-60',
        !isDisabled && 'cursor-pointer!'
      )}
    >
      <div className="flex h-6 w-full items-center justify-between">
        <div className="flex size-6 shrink-0 items-center justify-center">{icon}</div>
        {isSelected ? <RiCheckboxCircleFill className="text-success-base size-4 shrink-0" aria-hidden /> : badge}
        {!isSelected && !comingSoon ? <ConnectAction /> : null}
      </div>
      <span
        className={cn(
          'text-text-sub min-w-0 text-label-xs font-medium leading-4',
          !isDisabled && 'group-hover:text-text-strong group-focus-visible:text-text-strong'
        )}
      >
        {label}
      </span>
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
    <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3 md:grid-cols-[repeat(4,150px)]">
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
