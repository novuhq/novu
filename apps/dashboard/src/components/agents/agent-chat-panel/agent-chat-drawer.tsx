import { RiArrowRightUpLine, RiCloseLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { AgentChatPanel } from '@/components/agents/agent-chat-panel/agent-chat-panel';
import { AGENT_CHAT_DOCS_URL } from '@/components/agents/agent-chat-setup-content';
import { CursorPromptActions } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { CompactButton } from '@/components/primitives/button-compact';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { useAgentChatPrompt } from '@/hooks/use-agent-chat-prompt';

type AgentChatDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentResponse;
  /** Hide once the customer's app has sent a first inbound message (`connectedAt`). */
  showAddToAppCallouts?: boolean;
  /** Channels tab for this agent's web-chat integration. */
  addToAppHref?: string;
};

export function AgentChatDrawer({
  open,
  onOpenChange,
  agent,
  showAddToAppCallouts = false,
  addToAppHref,
}: AgentChatDrawerProps) {
  const prompt = useAgentChatPrompt(agent);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-bg-white flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[540px] [&_[data-close-button]]:hidden"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-stroke-soft bg-bg-weak flex h-[76px] shrink-0 items-start gap-2 border-b px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <img
                src="/images/providers/light/square/novu-agent-chat.svg"
                alt=""
                className="size-5 shrink-0"
                aria-hidden
              />
              <SheetTitle className="text-label-md text-text-strong font-medium leading-6">Web chat preview</SheetTitle>
            </div>
            <p className="text-paragraph-xs text-text-soft leading-4">
              Send a message to see how it replies.{' '}
              <a
                href={AGENT_CHAT_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-sub inline-flex items-baseline gap-0.5 underline decoration-from-font underline-offset-[3px]"
              >
                Read docs
                <RiArrowRightUpLine className="size-3 translate-y-px" aria-hidden />
              </a>
            </p>
            <VisuallyHidden>
              <SheetDescription>Preview this agent in web chat before adding it to your app.</SheetDescription>
            </VisuallyHidden>
          </div>
          <CompactButton
            size="lg"
            variant="ghost"
            icon={RiArrowRightUpLine}
            aria-label="Open docs"
            onClick={() => window.open(AGENT_CHAT_DOCS_URL, '_blank', 'noopener,noreferrer')}
          />
          <SheetClose asChild>
            <CompactButton size="lg" variant="ghost" icon={RiCloseLine} aria-label="Close" />
          </SheetClose>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-4">
          {showAddToAppCallouts ? (
            <div className="bg-bg-weak flex min-h-9 shrink-0 flex-wrap items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-2">
              <span className="bg-text-sub h-[22px] w-1 shrink-0 rounded-full" aria-hidden />
              <p className="text-label-xs text-text-strong min-w-0 flex-1 font-medium leading-4">
                Add Web Chat to your app
              </p>
              <CursorPromptActions prompt={prompt} source="agent-chat-preview-drawer" compact />
            </div>
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AgentChatPanel agent={agent} showAddToAppCallouts={showAddToAppCallouts} addToAppHref={addToAppHref} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
