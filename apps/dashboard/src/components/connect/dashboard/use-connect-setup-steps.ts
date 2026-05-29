import { DirectionEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  type AgentResponse,
  getAgentIntegrationsQueryKey,
  getAgentsListQueryKey,
  listAgentIntegrations,
  listAgents,
} from '@/api/agents';
import { getConversationsList } from '@/api/conversations';
import { conversationQueryKeys } from '@/components/conversations/conversation-query-keys';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { CONNECT_ONBOARDING_COMPLETED } from '@/utils/constants';

export type ConnectSetupStepId = 'create-account' | 'add-agent' | 'setup-channel' | 'send-first-message';

export type ConnectSetupStepStatus = 'completed' | 'pending';

export type ConnectSetupStep = {
  id: ConnectSetupStepId;
  title: string;
  description: string;
  status: ConnectSetupStepStatus;
  /**
   * Whether this step is associated with an actionable CTA in the UI.
   * `setup-channel` is only actionable when there is exactly one agent and zero connected channels.
   */
  ctaAvailable: boolean;
  /** The agent identifier to use for the CTA when `ctaAvailable` is true. Only set for `setup-channel`. */
  agentIdentifier?: string;
};

export type UseConnectSetupStepsResult = {
  steps: ConnectSetupStep[];
  isComplete: boolean;
  /** True while prerequisite queries are still resolving onboarding state. */
  isLoading: boolean;
  /** True only when onboarding is incomplete and setup state has been resolved. */
  shouldShowOnboarding: boolean;
  /** Drives welcome copy — avoids onboarding messaging flash for returning users while loading. */
  showOnboardingMessaging: boolean;
};

const AGENTS_PEEK_PARAMS = { after: undefined, before: undefined, limit: 2, identifier: '' };

export function useConnectSetupSteps(): UseConnectSetupStepsResult {
  const { currentEnvironment } = useEnvironment();

  const agentsQuery = useQuery({
    queryKey: getAgentsListQueryKey(currentEnvironment?._id, AGENTS_PEEK_PARAMS),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit: 2,
        orderBy: 'updatedAt',
        orderDirection: DirectionEnum.DESC,
      }),
    enabled: !!currentEnvironment,
  });

  const agents: AgentResponse[] = agentsQuery.data?.data ?? [];
  const hasAgent = agents.length > 0;
  const onlyAgent = agents.length === 1 ? agents[0] : undefined;

  const agentIntegrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, onlyAgent?.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        // biome-ignore lint/style/noNonNullAssertion: guarded by `enabled` below
        agentIdentifier: onlyAgent!.identifier,
        limit: 50,
      }),
    enabled: !!currentEnvironment && !!onlyAgent,
  });

  const hasConnectedChannelOnOnlyAgent = useMemo(() => {
    const links = agentIntegrationsQuery.data?.data ?? [];

    return links.some((link) => Boolean(link.connectedAt));
  }, [agentIntegrationsQuery.data?.data]);

  const conversationsQuery = useQuery({
    queryKey: [conversationQueryKeys.fetchConversations, currentEnvironment?._id, 'connect-setup-steps'],
    queryFn: ({ signal }) =>
      getConversationsList({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit: 1,
        signal,
      }),
    enabled: !!currentEnvironment,
    retry: false,
  });

  const hasAnyConversation =
    (conversationsQuery.data?.totalCount ?? 0) > 0 || (conversationsQuery.data?.data?.length ?? 0) > 0;

  const addAgentCompleted = hasAgent;
  const setupChannelCompleted = hasAgent && hasConnectedChannelOnOnlyAgent;
  const sendMessageCompleted = hasAnyConversation;
  const setupChannelCtaAvailable = agents.length === 1 && !hasConnectedChannelOnOnlyAgent;
  const agentSetupComplete = addAgentCompleted && setupChannelCompleted;

  const steps = useMemo<ConnectSetupStep[]>(
    () => [
      {
        id: 'create-account',
        title: 'Create your account',
        description: "You're signed in and ready to set up Connect.",
        status: 'completed',
        ctaAvailable: false,
      },
      {
        id: 'add-agent',
        title: 'Add an agent',
        description: 'Create your first agent to start conversing with subscribers.',
        status: addAgentCompleted ? 'completed' : 'pending',
        ctaAvailable: !addAgentCompleted,
      },
      {
        id: 'setup-channel',
        title: 'Setup a channel',
        description: 'Connect a provider so your agent can send and receive messages.',
        status: setupChannelCompleted ? 'completed' : 'pending',
        ctaAvailable: setupChannelCtaAvailable,
        agentIdentifier: setupChannelCtaAvailable ? onlyAgent?.identifier : undefined,
      },
      {
        id: 'send-first-message',
        title: 'Send your first message',
        description: 'Start a conversation with one of your subscribers.',
        status: sendMessageCompleted ? 'completed' : 'pending',
        ctaAvailable: false,
      },
    ],
    [addAgentCompleted, onlyAgent?.identifier, sendMessageCompleted, setupChannelCompleted, setupChannelCtaAvailable]
  );

  const isOnboardingCompletedInStorage = localStorage.getItem(CONNECT_ONBOARDING_COMPLETED) === 'true';
  const hasResolvedAgents = agentsQuery.isSuccess || agentsQuery.isError;
  const hasResolvedIntegrations = !onlyAgent || agentIntegrationsQuery.isSuccess || agentIntegrationsQuery.isError;
  const hasResolvedConversations = !hasAgent || conversationsQuery.isSuccess || conversationsQuery.isError;
  const isSetupResolved = hasResolvedAgents && hasResolvedIntegrations && hasResolvedConversations;
  const isComplete = isOnboardingCompletedInStorage || agentSetupComplete || hasAnyConversation;
  const isLoading = !isOnboardingCompletedInStorage && !isSetupResolved;
  const shouldShowOnboarding = isSetupResolved && !isComplete;
  const showOnboardingMessaging = isSetupResolved ? !isComplete : !isOnboardingCompletedInStorage;

  return {
    steps,
    isComplete,
    isLoading,
    shouldShowOnboarding,
    showOnboardingMessaging,
  };
}
