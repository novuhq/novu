import type { AgentResponse } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { AgentSetupSteps } from './agent-setup-steps';
import { SetupGuideCard } from './setup-guide-card';

type AgentSetupGuideProps = {
  agent: AgentResponse;
  /** Fires when the channel setup flow is finished (after Continue for rollout providers). */
  onSetupComplete?: () => void;
};

export function AgentSetupGuide({ agent, onSetupComplete }: AgentSetupGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const persistKey = `agent-setup-guide:${currentEnvironment?.slug ?? ''}:${agent.identifier}`;

  return (
    <SetupGuideCard label="Setup agent" persistKey={persistKey} className="min-w-0 flex-1">
      <AgentSetupSteps agent={agent} onSetupComplete={onSetupComplete} />
    </SetupGuideCard>
  );
}
