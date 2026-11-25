import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine, RiErrorWarningFill } from 'react-icons/ri';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { IconCmd, Kbd } from '@/components/primitives/kbd';
import { cn } from '@/utils/ui';
import { useCopilotPageView } from './copilot-page-view-store';
import { COPILOT_SURFACE_PROPS } from './copilot-surface';
import { DotGrid } from './copilot-thread-parts';
import { useCopilotWebChat } from './copilot-web-chat-context';
import {
  COPILOT_POPOVER_ID,
  COPILOT_SHEET_LIFT_PX,
  COPILOT_SHEET_LIFT_TRANSITION,
  deriveLauncherState,
  type LauncherState,
} from './copilot-web-chat-utils';
import { useModalDialogOpen } from './use-modal-dialog-open';

// Same timing as the popover, so the launcher folds into a circle while the popover grows out of it.
const LAUNCHER_TRANSITION = { duration: 0.15, ease: 'easeOut' } as const;

function LauncherStatus({ state }: { state: LauncherState }) {
  switch (state) {
    case 'working':
      return (
        <>
          <span className="text-label-xs text-text-soft">Working…</span>
          <RiArrowUpSLine className="size-4 text-text-soft" />
        </>
      );
    case 'ready':
      return <span className="text-label-xs text-success-base">Answer ready</span>;
    case 'error':
      return <span className="text-label-xs text-error-base">Couldn’t finish</span>;
    case 'off':
      return null;
    case 'idle':
      return (
        <Kbd aria-hidden className="gap-0.5 px-1.5">
          <IconCmd className="size-2.5" />
          <span>J</span>
        </Kbd>
      );
    default: {
      const unhandled: never = state;

      return unhandled;
    }
  }
}

function LauncherIcon({ state }: { state: LauncherState }) {
  switch (state) {
    case 'working':
      return (
        <DotGrid columns={3} stepMs={120} className="size-4 gap-[2px] [&>span]:size-[3px] [&>span]:bg-text-soft" />
      );
    case 'error':
      return <RiErrorWarningFill className="size-4 text-error-base" />;
    case 'idle':
    case 'ready':
    case 'off':
      return <BroomSparkle className={cn('size-4', state === 'off' && 'opacity-50')} />;
    default: {
      const unhandled: never = state;

      return unhandled;
    }
  }
}

export function CopilotLauncher() {
  const { isAvailable, isOpen, open, close, hasUnseenAnswer, hasRunError, isBusy } = useCopilotWebChat();
  // Over a sheet it stays visible above it, as the design shows, rising clear of the sheet's footer so its buttons stay usable.
  const isOverSheet = !!useCopilotPageView()?.overSheet;
  // Back under a modal dialog opened over the sheet, with the popover.
  const isModalDialogOpen = useModalDialogOpen();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(isOpen);
  const shouldReduceMotion = useReducedMotion();

  // The popover unmounts once its exit animation ends; when it held the focus, the page would otherwise drop it to the body.
  useEffect(() => {
    const focused = document.activeElement;
    const isFocusLeaving =
      !focused || focused === document.body || !!document.getElementById(COPILOT_POPOVER_ID)?.contains(focused);
    if (wasOpenRef.current && !isOpen && isFocusLeaving) buttonRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const state = deriveLauncherState({
    isAvailable,
    isRunning: isBusy,
    hasError: hasRunError,
    hasUnseenAnswer,
  });
  const isOff = !isOpen && state === 'off';

  return (
    // Closed, it is named by its visible text, so the status (Working…, Answer ready, Couldn’t finish) is read out with it.
    // One button for both states, so opening folds the label away and leaves a chevron-down close circle.
    <motion.button
      ref={buttonRef}
      type="button"
      {...COPILOT_SURFACE_PROPS}
      initial={false}
      animate={{ bottom: 16 + (isOverSheet ? COPILOT_SHEET_LIFT_PX : 0) }}
      transition={shouldReduceMotion ? { duration: 0 } : COPILOT_SHEET_LIFT_TRANSITION}
      disabled={isOff}
      onClick={isOpen ? close : () => open()}
      aria-label={isOpen ? 'Close Copilot' : undefined}
      title={isOpen ? 'Close Copilot' : undefined}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-keyshortcuts={isOpen || isOff ? undefined : 'Meta+J Control+J'}
      className={cn(
        'fixed right-4 flex h-[38px] items-center rounded-full border border-stroke-soft py-2 pr-2.5 transition-[padding,background-color] duration-150 ease-out motion-reduce:transition-colors',
        isOverSheet && !isModalDialogOpen ? 'z-[51]' : 'z-40',
        isOpen ? 'pl-2.5' : 'pl-3',
        isOff
          ? 'cursor-not-allowed bg-bg-weak'
          : 'bg-bg-white shadow-[0_8px_12px_rgba(15,23,41,0.04),0_1px_1px_rgba(15,23,41,0.04)] hover:bg-bg-weak'
      )}
    >
      {isOpen ? <RiArrowDownSLine className="size-4 text-text-sub" /> : <LauncherIcon state={state} />}
      <motion.span
        initial={false}
        animate={isOpen ? { width: 0, opacity: 0 } : { width: 'auto', opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : LAUNCHER_TRANSITION}
        className="overflow-hidden"
      >
        <span className="flex items-center gap-2 whitespace-nowrap pl-2">
          <span className={cn('text-label-sm', isOff ? 'text-text-soft' : 'text-text-strong')}>
            {isOff ? 'Copilot is off' : 'Ask Copilot'}
          </span>
          <LauncherStatus state={state} />
        </span>
      </motion.span>
    </motion.button>
  );
}
