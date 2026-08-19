import { RiArrowRightSLine } from 'react-icons/ri';
import { AGENT_CHAT_DOCS_URL, AgentChatEmbedResources } from '@/components/agents/agent-chat-setup-content';
import { ExternalLink } from '@/components/shared/external-link';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

type AgentChatSetupStepsProps = {
  prompt: string;
  stepOffset?: number;
  /** Omit to show all steps as completed (connected recap). */
  firstIncompleteStep?: number;
  onOpenChat?: () => void;
};

export function AgentChatSetupSteps({
  prompt,
  stepOffset = 1,
  firstIncompleteStep,
  onOpenChat,
}: AgentChatSetupStepsProps) {
  const base = stepOffset;

  return (
    <>
      <SetupStep
        index={base}
        status={firstIncompleteStep === undefined ? 'completed' : deriveStepStatus(base, firstIncompleteStep)}
        title="Try the agent on web chat"
        description="Chat with your agent to see how it responds before adding it to your app."
        rightContent={
          !onOpenChat ? undefined : (
            <button
              type="button"
              onClick={onOpenChat}
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-1 self-start text-label-xs font-medium"
            >
              <img
                src="/images/providers/light/square/novu-agent-chat.svg"
                alt=""
                className="size-4 shrink-0"
                aria-hidden
              />
              Preview chat
              <RiArrowRightSLine className="size-4 shrink-0" aria-hidden />
            </button>
          )
        }
      />
      <SetupStep
        index={base + 1}
        status={firstIncompleteStep === undefined ? 'completed' : deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Add Web Chat to your app"
        description={
          <>
            Use the prompt in Cursor to add <span className="font-code">useAgentChat</span>, or{' '}
            <ExternalLink href={AGENT_CHAT_DOCS_URL} className="inline-flex">
              follow the docs
            </ExternalLink>
          </>
        }
        rightContent={<AgentChatEmbedResources prompt={prompt} />}
      />
    </>
  );
}
