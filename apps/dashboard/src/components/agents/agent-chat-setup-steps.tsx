import { RiArrowRightSLine } from 'react-icons/ri';
import {
  AGENT_CHAT_DOCS_URL,
  AgentChatEmbedResources,
  buildAgentChatTuiCommand,
  buildAgentChatTuiCommandForDisplay,
} from '@/components/agents/agent-chat-setup-content';
import { CopyableTerminalBlock } from '@/components/primitives/copyable-terminal-block';
import { ExternalLink } from '@/components/shared/external-link';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

type AgentChatSetupStepsProps = {
  prompt: string;
  agentIdentifier: string;
  stepOffset?: number;
  /** Omit to show all steps as completed (connected recap). */
  firstIncompleteStep?: number;
  onOpenChat?: () => void;
};

export function AgentChatSetupSteps({
  prompt,
  agentIdentifier,
  stepOffset = 1,
  firstIncompleteStep,
  onOpenChat,
}: AgentChatSetupStepsProps) {
  const base = stepOffset;
  const tuiCommandOptions = {
    apiUrl: apiHostnameManager.getHostname(),
    agentIdentifier,
    connectDashboardUrl: window.location.origin,
  };
  const tuiDisplayCommand = buildAgentChatTuiCommandForDisplay(tuiCommandOptions);
  const tuiCopyCommand = buildAgentChatTuiCommand(tuiCommandOptions);

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
            Paste the prompt into your coding agent. It runs <span className="font-code">npx novu connect --ci</span>{' '}
            and asks you questions. Or copy the command and run the TUI yourself.{' '}
            <ExternalLink href={AGENT_CHAT_DOCS_URL} className="inline-flex">
              Read docs
            </ExternalLink>
          </>
        }
        extraContent={<CopyableTerminalBlock displayCommand={tuiDisplayCommand} copyCommand={tuiCopyCommand} />}
        rightContent={<AgentChatEmbedResources prompt={prompt} />}
      />
    </>
  );
}
