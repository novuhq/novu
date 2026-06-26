import type { ICredentials } from '@novu/shared';
import { useMemo, useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { useChannelFirstConnectedEndpoint } from '@/hooks/use-channel-first-connected-endpoint';
import { isAgentIntegrationConnected } from '../../is-agent-integration-connected';
import { SetupGuideCard } from '../../setup-guide-card';
import { CompletedStepIndicator, ListeningStatusView, SetupStep } from '../../setup-guide-primitives';
import { resolveChannelWhatsNextConfig } from './whats-next-config';
import type { WhatsNextStep } from './whats-next-types';

type AgentChannelWhatsNextGuideProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  /** Integration credentials (used by provider configs, e.g. Slack's distribution link). */
  credentials?: ICredentials;
  /** Current environment's identifier — used as the Novu `applicationIdentifier` in code samples and prompts. */
  applicationIdentifier?: string;
};

const CONVERSATIONS_AVAILABLE = !IS_SELF_HOSTED || IS_ENTERPRISE;

function ConnectedBadge() {
  return (
    <span className="bg-success-lighter flex items-center gap-1 rounded-md px-1 py-0.5">
      <span className="flex size-4 items-center justify-center rounded-full bg-success-lighter">
        <span className="bg-success-base size-1.5 rounded-full" />
      </span>
      <span className="text-success-base text-label-xs font-medium leading-4">Connected</span>
    </span>
  );
}

function StepRow({
  step,
  index,
  defaultStatus,
}: {
  step: WhatsNextStep;
  index: number;
  defaultStatus: 'completed' | 'current';
}) {
  return (
    <SetupStep
      index={index}
      status={step.status ?? defaultStatus}
      sectionLabel={step.sectionLabel}
      inlineSectionLabel
      title={step.title}
      description={step.description}
      headerSlot={step.headerSlot}
      rightContent={step.rightContent}
      extraContent={step.extraContent}
      fullWidthContent={step.fullWidthContent}
    />
  );
}

function RecapToggleRow({ count, isExpanded, onToggle }: { count: number; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex flex-col gap-4 pl-6">
      <div className="absolute -left-[20px] top-[3px] flex w-5 justify-center">
        <CompletedStepIndicator />
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="text-text-sub hover:text-text-strong flex items-center gap-0.5 self-start transition-colors"
      >
        <span className="text-label-xs font-medium">
          {isExpanded ? 'Hide instructions' : `Show all ${count} instructions`}
        </span>
        <RiExpandUpDownLine className="size-4" />
      </button>
    </div>
  );
}

function ChannelListeningFooter({ integrationIdentifier }: { integrationIdentifier: string }) {
  const { connected } = useChannelFirstConnectedEndpoint({
    integrationIdentifier,
    enabled: CONVERSATIONS_AVAILABLE,
  });

  const showListeningIndicator = CONVERSATIONS_AVAILABLE && !connected;

  return (
    <ListeningStatusView
      connected={connected}
      connectedTitle="Your users are connecting"
      connectedMessage="A user connected to this agent through your app. Nice work!"
      listeningMessage="Once a user connects through your app, their conversation will show up here."
      showStatusIndicator={connected || showListeningIndicator}
      className="py-4 pl-8"
    />
  );
}

export function AgentChannelWhatsNextGuide({
  agent,
  integrationLink,
  credentials,
  applicationIdentifier,
}: AgentChannelWhatsNextGuideProps) {
  const [isRecapExpanded, setIsRecapExpanded] = useState(false);

  const config = useMemo(
    () => resolveChannelWhatsNextConfig({ agent, integrationLink, credentials, applicationIdentifier }),
    [agent, integrationLink, credentials, applicationIdentifier]
  );

  if (!config) {
    return null;
  }

  const recapCount = config.recapSteps.length;

  return (
    <SetupGuideCard
      label="What's next"
      rightContent={isAgentIntegrationConnected(integrationLink) ? <ConnectedBadge /> : null}
    >
      <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6">
        <div
          className="absolute bottom-0 left-[22px] top-0 w-px"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
          }}
        />
        <RecapToggleRow
          count={recapCount}
          isExpanded={isRecapExpanded}
          onToggle={() => setIsRecapExpanded((prev) => !prev)}
        />
        {isRecapExpanded
          ? config.recapSteps.map((step, i) => (
              <StepRow key={`recap-${i}`} step={step} index={i + 1} defaultStatus="completed" />
            ))
          : null}
        {config.devSteps.map((step, i) => {
          const devStepIndex = isRecapExpanded ? recapCount + 1 + i : i + 1;

          return <StepRow key={`dev-${i}`} step={step} index={devStepIndex} defaultStatus="current" />;
        })}
      </div>
      <ChannelListeningFooter integrationIdentifier={integrationLink.integration.identifier} />
    </SetupGuideCard>
  );
}
