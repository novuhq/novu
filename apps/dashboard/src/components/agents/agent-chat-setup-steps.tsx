import { AgentChatEmbedResources } from '@/components/agents/agent-chat-setup-content';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

type AgentChatSetupStepsProps = {
  prompt: string;
  stepOffset?: number;
  /** Omit to show both steps as completed (connected recap). */
  firstIncompleteStep?: number;
};

export function AgentChatSetupSteps({ prompt, stepOffset = 1, firstIncompleteStep }: AgentChatSetupStepsProps) {
  const base = stepOffset;
  const recap = firstIncompleteStep === undefined;

  return (
    <>
      <SetupStep
        index={base}
        status={recap ? 'completed' : deriveStepStatus(base, firstIncompleteStep)}
        title="Add Agent Chat to your application"
        description="Open the prompt in Cursor to wire up useAgentChat, or follow the docs."
        fullWidthContent={<AgentChatEmbedResources prompt={prompt} />}
      />
      <SetupStep
        index={base + 1}
        status={recap ? 'completed' : deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Send a test message"
        description="Open your app and send a message in Agent Chat."
      />
    </>
  );
}
