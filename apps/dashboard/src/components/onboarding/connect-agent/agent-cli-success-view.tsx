import { AgentRuntimeProviderIdEnum, providers as novuProviders } from '@novu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { createPortal } from 'react-dom';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { getAgentChannelDisplayName } from '@/utils/agent-email-provider-display';
import { CompletedStepIndicator } from '@/components/agents/setup-guide-primitives';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { AgentCard, type AgentCardConnectorKind } from '@/components/onboarding/claude-agent-preview-illustration';

type AgentCliSuccessViewProps = {
  agent: AgentResponse;
  connectedLink: AgentIntegrationLink;
};

function resolveConnector(agent: AgentResponse): AgentCardConnectorKind {
  if (agent.runtime !== 'managed') return 'custom';

  return agent.managedRuntime?.providerId === AgentRuntimeProviderIdEnum.AnthropicAws ? 'aws' : 'anthropic';
}

function formatLastEvent(connectedAt: string | null | undefined, now: number): string {
  if (!connectedAt) return 'just now';

  const diffInSeconds = Math.floor((now - new Date(connectedAt).getTime()) / 1000);

  if (diffInSeconds < 5) return 'just now';

  if (diffInSeconds < 60) {
    const rounded = Math.round(diffInSeconds / 5) * 5;

    return `${rounded} seconds ago`;
  }

  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);

    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(diffInSeconds / 3600);

  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
}

function ConnectedStatusPill({ connectedAt }: { connectedAt: string | null | undefined }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);

    return () => clearInterval(interval);
  }, []);

  const lastEvent = formatLastEvent(connectedAt, now);

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e0faec] px-1.5 py-[2px]">
        <span className="relative inline-block size-[5px] rounded-full bg-[#1fc16b] shadow-[0_0_0_2px_rgba(31,193,107,0.18)]" />
        <span
          className="text-[9px] font-medium uppercase leading-3 tracking-[0.54px] text-[#1fc16b]"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        >
          CONNECTED
        </span>
      </span>
      <span className="text-text-soft text-label-xs font-normal leading-4">
        Last event received <span className="text-text-strong font-medium">{lastEvent}</span>
      </span>
    </div>
  );
}

/** One-shot confetti burst, fired the first time the success view mounts. */
function SuccessConfetti() {
  const [show, setShow] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    timeoutRef.current = window.setTimeout(() => setShow(false), 10_000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!show) return null;

  return createPortal(
    <ReactConfetti
      width={window.innerWidth}
      height={window.innerHeight}
      recycle={false}
      numberOfPieces={1000}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }}
    />,
    document.body
  );
}

/**
 * Success view shown once a CLI-created agent (Open in Cursor / Copy prompt) has a channel
 * connected. Mirrors the onboarding agent-preview step (a checked agent card on the rail),
 * followed by the connected-channel row and a live "last event received" status pill.
 */
export function AgentCliSuccessView({ agent, connectedLink }: AgentCliSuccessViewProps) {
  const connector = resolveConnector(agent);
  const isDemoCredential = agent.managedRuntime?.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic;
  const mcpServers = useMemo(
    () => agent.managedRuntime?.mcpServers?.map((server) => server.externalId) ?? [],
    [agent.managedRuntime?.mcpServers]
  );
  const tools = useMemo(
    () => agent.managedRuntime?.tools?.map((tool) => tool.externalId) ?? [],
    [agent.managedRuntime?.tools]
  );

  const providerId = connectedLink.integration.providerId;
  const providerMeta = novuProviders.find((provider) => provider.id === providerId);
  const channelName = getAgentChannelDisplayName(
    providerId,
    providerMeta?.displayName ?? connectedLink.integration.name
  );

  return (
    <div className="relative flex flex-col gap-10 py-6 pl-8 pr-3 md:pr-6">
      <SuccessConfetti />
      <div
        className="absolute bottom-0 left-[22px] top-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
        }}
      />

      <div className="relative flex flex-col pl-6">
        <div className="absolute left-[-20px] top-[3px] flex w-5 justify-center">
          <CompletedStepIndicator />
        </div>
        <AgentCard
          connector={connector}
          isDemoCredential={isDemoCredential}
          status="connected"
          agentCreated
          displayName={agent.name}
          isPlaceholderName={false}
          description={agent.description}
          identifier={agent.identifier}
          instructions={agent.managedRuntime?.systemPrompt}
          mcpServers={mcpServers}
          tools={tools}
        />
      </div>

      <div className="relative flex flex-col gap-3 pl-6">
        <div className="absolute left-[-20px] top-[3px] flex w-5 justify-center">
          <CompletedStepIndicator />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-strong text-label-sm font-medium leading-5">Connected to</span>
          <ProviderIcon providerId={providerId} providerDisplayName={channelName} className="size-4 shrink-0" />
          <span className="text-text-strong text-label-sm font-medium leading-5">{channelName}</span>
        </div>
        <ConnectedStatusPill connectedAt={connectedLink.connectedAt} />
      </div>
    </div>
  );
}
