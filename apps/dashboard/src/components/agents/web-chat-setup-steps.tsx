import type { NovuConnectBridgeRuntime } from '@novu/shared';
import { RiArrowRightSLine } from 'react-icons/ri';
import {
  WEB_CHAT_DOCS_URL,
  WebChatEmbedResources,
  buildWebChatTuiCommand,
  buildWebChatTuiCommandForDisplay,
} from '@/components/agents/web-chat-setup-content';
import { CopyableTerminalBlock } from '@/components/primitives/copyable-terminal-block';
import { ExternalLink } from '@/components/shared/external-link';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

type WebChatSetupStepsProps = {
  prompt: string;
  agentIdentifier: string;
  stepOffset?: number;
  /** Omit to show all steps as completed (connected recap). */
  firstIncompleteStep?: number;
  onOpenChat?: () => void;
  /** Self-hosted connector already chosen in the dashboard. Pins `--runtime` on the TUI command. */
  runtime?: NovuConnectBridgeRuntime;
};

export function WebChatSetupSteps({
  prompt,
  agentIdentifier,
  stepOffset = 1,
  firstIncompleteStep,
  onOpenChat,
  runtime,
}: WebChatSetupStepsProps) {
  const base = stepOffset;
  const tuiCommandOptions = {
    apiUrl: apiHostnameManager.getHostname(),
    agentIdentifier,
    connectDashboardUrl: window.location.origin,
    runtime,
  };
  const tuiDisplayCommand = buildWebChatTuiCommandForDisplay(tuiCommandOptions);
  const tuiCopyCommand = buildWebChatTuiCommand(tuiCommandOptions);

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
                src="/images/providers/light/square/novu-web-chat.svg"
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
            {runtime ? (
              <>
                Paste the prompt into your coding agent. It runs one{' '}
                <span className="font-code">npx novu connect --ci</span> with the runtime and channel you already chose.
                Or copy the command and run it yourself.{' '}
              </>
            ) : (
              <>
                Paste the prompt into your coding agent. It runs{' '}
                <span className="font-code">npx novu connect --ci</span> and asks you questions. Or copy the command and
                run the TUI yourself.{' '}
              </>
            )}
            <ExternalLink href={WEB_CHAT_DOCS_URL} className="inline-flex">
              Read docs
            </ExternalLink>
          </>
        }
        extraContent={<CopyableTerminalBlock displayCommand={tuiDisplayCommand} copyCommand={tuiCopyCommand} />}
        rightContent={<WebChatEmbedResources prompt={prompt} />}
      />
    </>
  );
}
