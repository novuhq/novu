import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  type AssistantState,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  type ToolCallMessagePartComponent,
  useAuiState,
} from '@assistant-ui/react';
import {
  type ComponentType,
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckLine,
  RiDownloadLine,
  RiFileCopyLine,
  RiLoader4Line,
  RiMoreLine,
} from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';
import { MessageChronology } from './day-separator';
import { MarkdownText } from './markdown-text';
import { Reasoning, ReasoningContent, ReasoningRoot, ReasoningText, ReasoningTrigger } from './reasoning.aui';
import { ToolFallback } from './tool-fallback.aui';
import { ToolGroupContent, ToolGroupRoot, ToolGroupTrigger } from './tool-group.aui';
import { TooltipIconButton } from './tooltip-icon-button';

export type ThreadGroupPart = MessagePrimitive.GroupedParts.GroupPart;

// biome-ignore lint/style/useComponentExportOnlyModules: grouping helper is used by Thread
export const defaultThreadPartGroupBy = groupPartByType({
  reasoning: ['group-chainOfThought', 'group-reasoning'],
  'tool-call': ['group-chainOfThought', 'group-tool'],
  'standalone-tool-call': [],
});

export type ThreadComponents = {
  AssistantMessage?: ComponentType | undefined;
  UserMessage?: ComponentType | undefined;
  Welcome?: ComponentType | undefined;
  Indicator?: ComponentType | undefined;
  Banner?: ComponentType | undefined;
  Composer?: ComponentType<{ autoFocus: boolean }> | undefined;
  AfterComposer?: ComponentType | undefined;
  ToolFallback?: ToolCallMessagePartComponent | undefined;
  ToolGroup?: ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>> | undefined;
  ReasoningGroup?: ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>> | undefined;
  groupBy?: typeof defaultThreadPartGroupBy;
};

export type ThreadProps = {
  components?: ThreadComponents | undefined;
  autoFocus?: boolean | undefined;
};

const EMPTY_COMPONENTS: ThreadComponents = {};

const ThreadComponentsContext = createContext<ThreadComponents>(EMPTY_COMPONENTS);

const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 && (!s.thread.isLoading || s.threads.isLoading);

const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 && s.thread.isLoading && !s.thread.isDisabled && !s.threads.isLoading;

const ThreadHistorySkeleton: FC = () => (
  <output
    data-slot="aui_thread-history-skeleton"
    className="animate-in fade-in flex flex-col gap-y-6 [animation-delay:150ms] [animation-duration:200ms]"
  >
    <span className="sr-only">Loading conversation</span>
    <Skeleton className="ml-auto h-9 w-2/5 rounded-xl" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
    <Skeleton className="ml-auto h-9 w-1/3 rounded-xl" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-10/12" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </output>
);

export const Thread: FC<ThreadProps> = ({ components = EMPTY_COMPONENTS, autoFocus = true }) => {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ThreadComponentsContext.Provider value={components}>
      <ThreadRoot isEmpty={isEmpty} autoFocus={autoFocus} />
    </ThreadComponentsContext.Provider>
  );
};

const ThreadRoot: FC<{ isEmpty: boolean; autoFocus: boolean }> = ({ isEmpty, autoFocus }) => {
  const {
    Welcome = ThreadWelcome,
    Banner,
    Composer: ComposerComponent = Composer,
    AfterComposer,
  } = useContext(ThreadComponentsContext);

  return (
    <ThreadPrimitive.Root className="aui-root aui-thread-root bg-bg-white @container flex h-full flex-col">
      <ThreadPrimitive.Viewport
        data-slot="aui_thread-viewport"
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-auto [overflow-anchor:none]"
      >
        <div className={cn('mx-auto flex w-full flex-1 flex-col px-1 pt-2', isEmpty && 'justify-center')}>
          <AuiIf condition={isNewChatView}>
            <Welcome />
          </AuiIf>
          <AuiIf condition={isHistoryLoadingView}>
            <ThreadHistorySkeleton />
          </AuiIf>

          <div data-slot="aui_message-group" className="mb-16 flex flex-col gap-y-6 empty:hidden">
            <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter
            className={cn(
              'bg-bg-white flex flex-col gap-3 overflow-visible pb-4',
              !isEmpty && 'sticky bottom-0 mt-auto'
            )}
          >
            <ThreadViewportBottomStateSync />
            <ThreadScrollToBottom />
            {Banner ? <Banner /> : null}
            <ComposerComponent autoFocus={autoFocus} />
            <AuiIf condition={isNewChatView}>
              <ThreadSuggestions />
              {AfterComposer ? <AfterComposer /> : null}
            </AuiIf>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } = useContext(ThreadComponentsContext);
  const { UserMessage: UserMessageComponent = UserMessage } = useContext(ThreadComponentsContext);
  const role = useAuiState((s) => s.message.role);

  return (
    <MessageChronology>{role === 'user' ? <UserMessageComponent /> : <AssistantMessageComponent />}</MessageChronology>
  );
};

const ThreadViewportBottomStateSync: FC = () => {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const viewport = markerRef.current?.closest<HTMLElement>('[data-slot="aui_thread-viewport"]');
    if (!viewport) return;

    let frame: number | undefined;
    const syncIfAtBottom = () => {
      cancelAnimationFrame(frame ?? 0);
      frame = requestAnimationFrame(() => {
        const bottomDistance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        if (Math.abs(bottomDistance) <= 1) {
          viewport.dispatchEvent(new Event('scroll'));
        }
      });
    };

    const observer = new MutationObserver((mutations) => {
      const reserveChanged = mutations.some((mutation) => {
        const target = mutation.target;
        if (target instanceof HTMLElement && target.matches('[data-aui-top-anchor-reserve]')) {
          return true;
        }

        return [...mutation.addedNodes, ...mutation.removedNodes].some(
          (node) =>
            node instanceof HTMLElement &&
            (node.matches('[data-aui-top-anchor-reserve]') || node.querySelector('[data-aui-top-anchor-reserve]'))
        );
      });

      if (reserveChanged) syncIfAtBottom();
    });

    observer.observe(viewport, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame ?? 0);
    };
  }, []);

  return <span ref={markerRef} hidden aria-hidden />;
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom
      render={
        <TooltipIconButton
          tooltip="Scroll to bottom"
          className="border-stroke-soft bg-bg-white/90 absolute -top-12 z-10 self-center size-8 rounded-full border shadow-xs backdrop-blur disabled:invisible"
        />
      }
    >
      <RiArrowDownLine className="size-4" />
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="mb-6 flex flex-col items-center px-4 text-center">
      <h1 className="text-text-strong fade-in slide-in-from-bottom-1 animate-in text-xl font-medium tracking-tight duration-200">
        How can I help you today?
      </h1>
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  const composerEmpty = useAuiState((s) => s.composer.isEmpty);

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center justify-center gap-2 px-1',
        !composerEmpty && 'pointer-events-none invisible'
      )}
      aria-hidden={!composerEmpty}
    >
      <ThreadPrimitive.Suggestions>{() => <ThreadSuggestionItem />}</ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="fade-in slide-in-from-bottom-2 animate-in duration-200">
      <SuggestionPrimitive.Trigger
        send
        render={
          <Button
            variant="secondary"
            mode="outline"
            size="2xs"
            className="h-auto rounded-full px-3.5 py-1.5 font-normal"
          />
        }
      >
        <SuggestionPrimitive.Title />
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const Composer: FC<{ autoFocus: boolean }> = ({ autoFocus }) => {
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      <div className="border-stroke-soft bg-bg-white focus-within:border-stroke-strong flex w-full flex-col gap-2 rounded-xl border p-2 transition-[border-color]">
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="placeholder:text-text-soft max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-[13px] leading-5 outline-none"
          rows={1}
          autoFocus={autoFocus}
          enterKeyHint="send"
          aria-label="Message input"
        />
        <div className="flex min-h-7 items-center justify-end">
          <AuiIf condition={(s) => !s.thread.isRunning && !s.thread.isDisabled}>
            <ComposerPrimitive.Send
              render={
                <Button
                  type="button"
                  variant="primary"
                  mode="filled"
                  size="xs"
                  className="size-7 shrink-0 rounded-full p-0"
                  leadingIcon={RiArrowUpLine}
                  aria-label="Send message"
                />
              }
            />
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning || s.thread.isDisabled}>
            <output className="text-text-soft flex size-7 items-center justify-center">
              <RiLoader4Line className="size-4 animate-spin" aria-hidden />
              <span className="sr-only">Agent is working</span>
            </output>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const RunningToolGroup: FC<PropsWithChildren<{ group: ThreadGroupPart }>> = ({ group, children }) => {
  const running = group.status.type === 'running';
  const [open, setOpen] = useState(running);
  const [prevRunning, setPrevRunning] = useState(running);

  if (running !== prevRunning) {
    setPrevRunning(running);
    if (running) setOpen(true);
  }

  return (
    <ToolGroupRoot open={open} onOpenChange={setOpen}>
      <ToolGroupTrigger count={group.indices.length} active={running} />
      <ToolGroupContent>{children}</ToolGroupContent>
    </ToolGroupRoot>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="border-error-light bg-red-alpha-10 text-error-base mt-2 rounded-md border p-3 text-sm">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  const {
    Indicator: IndicatorComponent = AssistantMessageIndicator,
    ToolFallback: ToolFallbackComponent = ToolFallback,
    ToolGroup,
    ReasoningGroup,
    groupBy = defaultThreadPartGroupBy,
  } = useContext(ThreadComponentsContext);

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 pb-7.5 duration-150"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="text-paragraph-sm text-text-strong px-2 leading-5 wrap-break-word"
      >
        <MessagePrimitive.GroupedParts groupBy={groupBy}>
          {({ part, children }) => {
            switch (part.type) {
              case 'group-chainOfThought':
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case 'group-tool':
                if (ToolGroup) {
                  return <ToolGroup group={part}>{children}</ToolGroup>;
                }

                return <RunningToolGroup group={part}>{children}</RunningToolGroup>;
              case 'group-reasoning': {
                if (ReasoningGroup) {
                  return <ReasoningGroup group={part}>{children}</ReasoningGroup>;
                }
                const running = part.status.type === 'running';

                return (
                  <ReasoningRoot streaming={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case 'text':
                return <MarkdownText />;
              case 'reasoning':
                return <Reasoning {...part} />;
              case 'tool-call':
                return part.toolUI ?? <ToolFallbackComponent {...part} />;
              case 'data':
                return part.dataRendererUI;
              case 'indicator':
                return <IndicatorComponent />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      <div data-slot="aui_assistant-message-footer" className="ms-2 flex min-h-7.5 items-center pt-1.5">
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessageIndicator: FC = () => (
  <output data-slot="aui_assistant-message-indicator" className="animate-pulse font-sans">
    ●<span className="sr-only">Assistant is working</span>
  </output>
);

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="text-text-soft animate-in fade-in -ms-1 flex gap-1 duration-200"
    >
      <ActionBarPrimitive.Copy render={<TooltipIconButton tooltip="Copy" />}>
        <AuiIf condition={(s) => s.message.isCopied}>
          <RiCheckLine className="size-3.5" />
        </AuiIf>
        <AuiIf condition={(s) => !s.message.isCopied}>
          <RiFileCopyLine className="size-3.5" />
        </AuiIf>
      </ActionBarPrimitive.Copy>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger render={<TooltipIconButton tooltip="More" />}>
          <RiMoreLine className="size-3.5" />
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="bg-bg-white text-text-strong z-50 min-w-[8rem] overflow-hidden rounded-xl border border-stroke-soft p-1.5 shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown
            render={
              <ActionBarMorePrimitive.Item className="hover:bg-bg-weak flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none" />
            }
          >
            <RiDownloadLine className="size-4" />
            Export as Markdown
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <div className="relative col-start-2 min-w-0">
        <div className="bg-bg-weak text-paragraph-sm text-text-strong rounded-xl px-4 py-2 leading-5 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
