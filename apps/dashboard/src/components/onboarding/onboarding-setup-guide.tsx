import { type IEnvironment } from '@novu/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AGENTS_LIST_QUERY_KEY,
  type AgentResponse,
  createAgent,
  getAgent,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { AgentSetupSteps } from '@/components/agents/agent-setup-steps';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

const DEFAULT_AGENT_NAME = 'Support agent';
const DEFAULT_AGENT_IDENTIFIER = 'support-agent';
const DEFAULT_AGENT_DESCRIPTION = 'Handles customer questions across your connected channels.';

async function ensureAgent(
  env: IEnvironment,
  track: ReturnType<typeof useTelemetry>
): Promise<AgentResponse> {
  try {
    return await getAgent(env, DEFAULT_AGENT_IDENTIFIER);
  } catch (error) {
    if (!(error instanceof NovuApiError && error.status === 404)) {
      throw error;
    }

    const created = await createAgent(env, {
      name: DEFAULT_AGENT_NAME,
      identifier: DEFAULT_AGENT_IDENTIFIER,
      description: DEFAULT_AGENT_DESCRIPTION,
    });

    track(TelemetryEvent.AGENT_CREATED_FROM_DASHBOARD, {
      agentIdentifier: created.identifier,
      source: 'onboarding',
    });

    return created;
  }
}

type OnboardingSetupGuideProps = {
  onBridgeConnected?: () => void;
};

export function OnboardingSetupGuide({ onBridgeConnected }: OnboardingSetupGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const track = useTelemetry();

  const { data: agent } = useQuery({
    queryKey: [AGENTS_LIST_QUERY_KEY, 'onboarding-agent', currentEnvironment?._id],
    queryFn: async () => {
      const env = requireEnvironment(currentEnvironment, 'No environment selected');
      const resolved = await ensureAgent(env, track);

      queryClient.invalidateQueries({ queryKey: [AGENTS_LIST_QUERY_KEY] });

      return resolved;
    },
    enabled: Boolean(currentEnvironment),
    retry: 2,
    staleTime: Infinity,
  });

  if (!agent) {
    return null;
  }

  return <AgentSetupSteps agent={agent} onBridgeConnected={onBridgeConnected} hideAddProvider />;
}
