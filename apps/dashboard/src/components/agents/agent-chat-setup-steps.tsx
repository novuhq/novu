import { RiArrowRightSLine } from 'react-icons/ri';
import { AgentChatEmbedResources } from '@/components/agents/agent-chat-setup-content';
import { Button } from '@/components/primitives/button';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

type AgentChatSetupStepsProps = {
  prompt: string;
  stepOffset?: number;
  /** Omit to show all steps as completed (connected recap). */
  firstIncompleteStep?: number;
  onOpenTryIt?: () => void;
};

export function AgentChatSetupSteps({
  prompt,
  stepOffset = 1,
  firstIncompleteStep,
  onOpenTryIt,
}: AgentChatSetupStepsProps) {
  const base = stepOffset;
  const recap = firstIncompleteStep === undefined;

  return (
    <>
      <SetupStep
        index={base}
        status={recap ? 'completed' : deriveStepStatus(base, firstIncompleteStep)}
        title="Try it in the dashboard"
        description="Chat as yourself to test prompts, tools, and MCPs. This does not connect your app."
        extraContent={
          recap || !onOpenTryIt ? undefined : (
            <Button
              type="button"
              variant="primary"
              size="xs"
              onClick={onOpenTryIt}
              trailingIcon={RiArrowRightSLine}
              className="self-start"
            >
              Open Try it tab
            </Button>
          )
        }
      />
      <SetupStep
        index={base + 1}
        status={recap ? 'completed' : deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Add Agent Chat to your application"
        description="Open the prompt in Cursor to wire up useAgentChat, or follow the docs."
        fullWidthContent={<AgentChatEmbedResources prompt={prompt} />}
      />
      <SetupStep
        index={base + 2}
        status={recap ? 'completed' : deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Go live from your app"
        description="Send a message in your app. We mark the channel Connected when it arrives."
      />
    </>
  );
}
