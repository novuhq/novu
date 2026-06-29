import type { AgentResponse } from '@/api/agents';
import { AgentSetupSteps } from './agent-setup-steps';
import { SetupGuideCard } from './setup-guide-card';

type AgentSetupGuideProps = {
  agent: AgentResponse;
  /** Fires when the channel setup flow is finished (after Continue for rollout providers). */
  onSetupComplete?: () => void;
};

export function AgentSetupGuide({ agent, onSetupComplete }: AgentSetupGuideProps) {
  return (
    <SetupGuideCard label="Setup agent" className="min-w-0 flex-1">
      <AgentSetupSteps agent={agent} onSetupComplete={onSetupComplete} />
    </SetupGuideCard>
  );
}
