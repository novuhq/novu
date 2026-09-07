/** biome-ignore-all lint/correctness/useUniqueElementIds: expected */
import { RiArrowRightUpLine, RiCloseLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { WebChatPanel } from '@/components/agents/web-chat-panel/web-chat-panel';
import { WEB_CHAT_DOCS_URL } from '@/components/agents/web-chat-setup-content';
import { CursorPromptActions } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { CompactButton } from '@/components/primitives/button-compact';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { useWebChatPrompt } from '@/hooks/use-web-chat-prompt';

const MIN_SIZE_PX = 280;
const DEFAULT_SIZE_PX = 540;
const MAX_SIZE = '60%';

type WebChatDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentResponse;
  /** Hide once the customer's app has sent a first inbound message (`connectedAt`). */
  showAddToAppCallouts?: boolean;
  /** Channels tab for this agent's web-chat integration. */
  addToAppHref?: string;
};

export function WebChatDrawer({
  open,
  onOpenChange,
  agent,
  showAddToAppCallouts = false,
  addToAppHref,
}: WebChatDrawerProps) {
  const prompt = useWebChatPrompt(agent);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="pointer-events-none inset-0 w-full max-w-none border-0 bg-transparent p-0 shadow-none transition-transform sm:max-w-none [&_[data-close-button]]:hidden"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <ResizablePanelGroup
          orientation="horizontal"
          autoSaveId="web-chat-preview"
          className="pointer-events-none h-full"
        >
          <ResizablePanel id="web-chat-preview-spacer" minSize="20%" className="pointer-events-auto h-full">
            <button
              type="button"
              className="size-full cursor-default"
              aria-label="Close web chat preview"
              onClick={() => onOpenChange(false)}
            />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className="pointer-events-auto"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          />
          <ResizablePanel
            id="web-chat-preview-panel"
            minSize={MIN_SIZE_PX}
            defaultSize={DEFAULT_SIZE_PX}
            maxSize={MAX_SIZE}
            groupResizeBehavior="preserve-pixel-size"
            className="bg-bg-white pointer-events-auto flex h-full flex-col overflow-hidden shadow-lg"
          >
            <div className="border-stroke-soft bg-bg-weak flex h-[76px] shrink-0 items-start gap-2 border-b px-4 py-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <img
                    src="/images/providers/light/square/novu-web-chat.svg"
                    alt=""
                    className="size-5 shrink-0"
                    aria-hidden
                  />
                  <SheetTitle className="text-label-md text-text-strong font-medium leading-6">
                    Web chat preview
                  </SheetTitle>
                </div>
                <p className="text-paragraph-xs text-text-soft leading-4">
                  Send a message to see how it replies.{' '}
                  <a
                    href={WEB_CHAT_DOCS_URL}
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
              <SheetClose asChild>
                <CompactButton size="lg" variant="ghost" icon={RiCloseLine} aria-label="Close" />
              </SheetClose>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-4 pb-4">
              {showAddToAppCallouts ? (
                <div className="bg-bg-weak flex min-h-9 shrink-0 flex-wrap items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-2">
                  <span className="bg-text-sub h-[22px] w-1 shrink-0 rounded-full" aria-hidden />
                  <p className="text-label-xs text-text-strong min-w-0 flex-1 font-medium leading-4">
                    Add Web Chat to your app
                  </p>
                  <CursorPromptActions prompt={prompt} source="web-chat-preview-drawer" compact />
                </div>
              ) : null}

              <WebChatPanel agent={agent} showAddToAppCallouts={showAddToAppCallouts} addToAppHref={addToAppHref} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SheetContent>
    </Sheet>
  );
}
