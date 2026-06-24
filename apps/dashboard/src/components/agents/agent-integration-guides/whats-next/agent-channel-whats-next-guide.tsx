import type { ICredentials } from '@novu/shared';
import { CheckCircle2, Loader } from 'lucide-react';
import { useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ExternalLink } from '@/components/shared/external-link';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { useChannelFirstConversation } from '@/hooks/use-channel-first-conversation';
import { AGENTS_DOCS_PROVIDERS_URL } from '@/utils/agent-docs';
import { isAgentIntegrationConnected } from '../../is-agent-integration-connected';
import { SetupGuideCard } from '../../setup-guide-card';
import { CompletedStepIndicator, SetupStep } from '../../setup-guide-primitives';
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

function ChannelListeningFooter({
  agentIdentifier,
  integrationId,
  provider,
}: {
  agentIdentifier: string;
  integrationId: string;
  provider: string;
}) {
  const { connected } = useChannelFirstConversation({
    agentIdentifier,
    integrationId,
    provider,
    enabled: CONVERSATIONS_AVAILABLE,
  });

  const showListening = CONVERSATIONS_AVAILABLE && !connected;

  return (
    <div className="flex flex-col gap-2 py-4 pl-8">
      <div className="flex flex-col gap-3">
        {connected ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="text-success-base size-3.5 shrink-0" />
            <span className="text-text-strong text-label-sm font-medium">Your users are connecting</span>
          </div>
        ) : showListening ? (
          <div className="flex items-center gap-1">
            <Loader className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
            <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
              Listening...
            </span>
          </div>
        ) : null}
        <p className="text-text-soft text-label-xs font-medium leading-4">
          {connected
            ? 'A user connected to this agent through your app. Nice work!'
            : 'Once a user connects through your app, their conversation will show up here.'}
        </p>
      </div>
      <ExternalLink href={AGENTS_DOCS_PROVIDERS_URL} variant="documentation">
        Learn more in docs
      </ExternalLink>
    </div>
  );
}

export function AgentChannelWhatsNextGuide({
  agent,
  integrationLink,
  credentials,
  applicationIdentifier,
}: AgentChannelWhatsNextGuideProps) {
  const [isRecapExpanded, setIsRecapExpanded] = useState(false);

  const config = resolveChannelWhatsNextConfig({ agent, integrationLink, credentials, applicationIdentifier });

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
        {config.devSteps.map((step, i) => (
          <StepRow key={`dev-${i}`} step={step} index={recapCount + 1 + i} defaultStatus="current" />
        ))}
      </div>
      <ChannelListeningFooter
        agentIdentifier={agent.identifier}
        integrationId={integrationLink.integration._id}
        provider={integrationLink.integration.providerId}
      />
    </SetupGuideCard>
  );
}
