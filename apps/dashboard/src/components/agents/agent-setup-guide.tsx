import type { AgentResponse } from '@/api/agents';
import { AgentSetupSteps } from './agent-setup-steps';
import { SetupGuideCard } from './setup-guide-card';

type AgentSetupGuideProps = {
  agent: AgentResponse;
};

export function AgentSetupGuide({ agent }: AgentSetupGuideProps) {
  return (
    <SetupGuideCard label="Setup agent" className="min-w-0 flex-1">
      <AgentSetupSteps agent={agent} />
    </SetupGuideCard>
  );
}
