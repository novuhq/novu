import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AgentResponse, type AgentSubscriberAccess, getAgentDetailQueryKey, updateAgent } from '@/api/agents';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

const PROD_READ_ONLY_TOOLTIP =
  'This setting is read-only in production. Edit in Development and promote to apply changes.';

/** True when the agent auto-provisions subscribers from unknown senders. */
function isSubscriberAccessOpen(agent: AgentResponse): boolean {
  return agent.behavior?.subscriberAccess === 'open';
}

type SubscriberAccessToggleProps = {
  agent: AgentResponse;
  ariaLabel?: string;
};

/**
 * Switch that flips an agent between "open" (auto-provision a lightweight
 * subscriber from any unknown sender) and "restricted" (only act for known
 * subscribers). This is a per-agent `behavior.subscriberAccess` setting shared
 * across every channel the agent is connected to, so the same toggle is surfaced
 * on each channel card (email inbox, Slack, Teams, …). Read-only in production,
 * matching the rest of agent behavior — edit in Development and promote.
 */
export function SubscriberAccessToggle({ agent, ariaLabel }: SubscriberAccessToggleProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment, readOnly } = useEnvironment();

  const isOpen = isSubscriberAccessOpen(agent);

  const { mutate, isPending } = useMutation({
    mutationFn: (subscriberAccess: AgentSubscriberAccess) =>
      updateAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        behavior: { subscriberAccess },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agent.identifier),
      });
    },
    onError: (err: Error) => {
      showErrorToast(err.message, 'Failed to update subscriber access');
    },
  });

  if (readOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Switch checked={isOpen} disabled aria-label={ariaLabel} />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{PROD_READ_ONLY_TOOLTIP}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Switch
      checked={isOpen}
      disabled={isPending}
      aria-label={ariaLabel}
      onCheckedChange={(checked) => mutate(checked ? 'open' : 'restricted')}
    />
  );
}
