import type { AgentResponse } from '@/api/agents';
import { SubscriberAccessToggle } from '@/components/agents/subscriber-access-toggle';
import { DetailSection } from './agent-integration-guides/agent-connected-details-shell';

/**
 * Per-agent "who can message this agent" control on the Agent Overview page.
 * Flips `behavior.subscriberAccess`; the effect is immediate on provision-capable
 * channels (Slack/Teams auto-provision unknown senders when open) and governs
 * later gating on link-only channels. Shared across every channel the agent is
 * connected to, so it lives with the agent's settings rather than a channel card.
 */
export function SubscriberAccessSection({ agent }: { agent: AgentResponse }) {
  return (
    <DetailSection title="Who can message this agent">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-text-sub text-label-sm font-medium leading-5">Auto-create subscribers</span>
          <p className="text-text-soft text-paragraph-xs leading-4">
            Open lets anyone message your agent — a lightweight subscriber is created so it can reply, merging into
            their account when they sign up. Off replies only to known subscribers.
          </p>
        </div>
        <SubscriberAccessToggle agent={agent} ariaLabel="Auto-create subscribers from unknown senders" />
      </div>
    </DetailSection>
  );
}
