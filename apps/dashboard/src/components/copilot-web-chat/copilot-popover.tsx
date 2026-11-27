import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RiAddLine, RiCloseLine, RiHistoryLine } from 'react-icons/ri';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { cn } from '@/utils/ui';
import { CopilotLauncher } from './copilot-launcher';
import { useCopilotPageView } from './copilot-page-view-store';
import { useCopilotPopoverTitle } from './copilot-popover-title';
import { COPILOT_SURFACE_PROPS } from './copilot-surface';
import { CopilotThreadPanel } from './copilot-thread-panel';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { COPILOT_POPOVER_ID, COPILOT_SHEET_LIFT_PX, COPILOT_SHEET_LIFT_TRANSITION } from './copilot-web-chat-utils';
import { useModalDialogOpen } from './use-modal-dialog-open';

// Mirrors the Popover primitive: fade, zoom from 95% and an 8px rise, growing out of the launcher.
const POPOVER_HIDDEN = { opacity: 0, scale: 0.95, y: 8 };
const POPOVER_SHOWN = { opacity: 1, scale: 1, y: 0 };
const POPOVER_TRANSITION = { duration: 0.15, ease: 'easeOut' } as const;

function HeaderButton({
  label,
  onClick,
  disabled,
  isPressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** For a toggle: whether what it shows is open. */
  isPressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isPressed}
      className={cn(
        'flex size-6 items-center justify-center rounded-md text-text-soft hover:bg-bg-soft hover:text-text-strong disabled:pointer-events-none disabled:opacity-40',
        isPressed && 'bg-bg-soft text-text-strong'
      )}
    >
      {children}
    </button>
  );
}

export function CopilotPopover() {
  const { isAvailable, isOpen, close, chat, startNewConversation, isBusy, isHistoryOpen, openHistory, closeHistory } =
    useCopilotWebChat();
  const conversationTitle = useCopilotPopoverTitle(chat);
  const title = isHistoryOpen ? 'Chats' : conversationTitle;
  // Above a sheet (z-50) and its overlay, with the launcher, as the design shows it.
  const isOverSheet = !!useCopilotPageView()?.overSheet;
  // Back under a modal dialog opened over the sheet, which dims and blocks everything else.
  const isModalDialogOpen = useModalDialogOpen();
  const shouldReduceMotion = useReducedMotion();
  // 66px puts it 12px above the launcher; it rises with the launcher over a sheet.
  const bottom = 66 + (isOverSheet ? COPILOT_SHEET_LIFT_PX : 0);
  const hidden = { ...(shouldReduceMotion ? { opacity: 0 } : POPOVER_HIDDEN), bottom };
  const shown = { ...(shouldReduceMotion ? { opacity: 1 } : POPOVER_SHOWN), bottom };

  return (
    <AnimatePresence>
      {isOpen && isAvailable && (
        <motion.div
          id={COPILOT_POPOVER_ID}
          {...COPILOT_SURFACE_PROPS}
          role="dialog"
          aria-label="Novu Copilot"
          initial={hidden}
          animate={shown}
          exit={hidden}
          transition={{
            ...POPOVER_TRANSITION,
            bottom: shouldReduceMotion ? { duration: 0 } : COPILOT_SHEET_LIFT_TRANSITION,
          }}
          className={cn(
            'fixed right-4 flex h-[600px] w-[400px] origin-bottom-right flex-col overflow-hidden rounded-xl border border-stroke-soft bg-bg-white shadow-[0_2px_4px_rgba(15,18,26,0.04),0_12px_32px_-8px_rgba(15,18,26,0.08)]',
            isOverSheet && !isModalDialogOpen ? 'z-[51]' : 'z-40',
            isOverSheet ? 'max-h-[min(600px,calc(100vh-139px))]' : 'max-h-[min(600px,calc(100vh-82px))]'
          )}
        >
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stroke-soft bg-bg-weak pl-3.5 pr-2">
            <BroomSparkle className="size-4 shrink-0" isAnimating={isBusy} />
            <span className="min-w-0 flex-1 truncate text-label-sm text-text-sub">{title}</span>
            <HeaderButton
              label="Chat history"
              disabled={!isAvailable}
              isPressed={isHistoryOpen}
              onClick={isHistoryOpen ? closeHistory : openHistory}
            >
              <RiHistoryLine className="size-3.5" />
            </HeaderButton>
            <HeaderButton label="New chat" disabled={!!chat?.isRunning} onClick={startNewConversation}>
              <RiAddLine className="size-3.5" />
            </HeaderButton>
            <HeaderButton label="Close" onClick={close}>
              <RiCloseLine className="size-3.5" />
            </HeaderButton>
          </div>
          <CopilotThreadPanel />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Shows the launcher/popover only once a page registered its context: the canvas or step editor, or a Copilot page. */
export function CopilotPopoverMount() {
  const { pageContext } = useCopilotWebChat();

  if (!pageContext?.workflowId && !pageContext?.page) return null;

  return (
    <>
      <CopilotLauncher />
      <CopilotPopover />
    </>
  );
}
