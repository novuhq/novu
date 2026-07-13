import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AgentResponse, type AgentSubscriberAccess, getAgentDetailQueryKey, updateAgent } from '@/api/agents';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

const PROD_READ_ONLY_TOOLTIP =
  'This setting is read-only in production. Edit in Development and promote to apply changes.';

/** True when the agent auto-creates subscribers from unknown email senders. */
function isEmailSubscriberAccessOpen(agent: AgentResponse): boolean {
  return agent.behavior?.subscriberAccess === 'open';
}

type EmailSubscriberAccessToggleProps = {
  agent: AgentResponse;
  ariaLabel?: string;
};

/**
 * Switch that flips an email agent between "open" (auto-provision a lightweight
 * subscriber from any sender's email) and "restricted" (reject unknown senders).
 * Shared by the layer-2 "What's next" onboarding guide and the persistent EMAIL
 * card so the setting stays reachable after onboarding. Read-only in production,
 * matching the rest of agent behavior — edit in Development and promote.
 */
export function EmailSubscriberAccessToggle({ agent, ariaLabel }: EmailSubscriberAccessToggleProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment, readOnly } = useEnvironment();

  const isOpen = isEmailSubscriberAccessOpen(agent);

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
