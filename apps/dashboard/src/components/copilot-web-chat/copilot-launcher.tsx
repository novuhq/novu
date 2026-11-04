import { useEffect, useRef } from 'react';
import { RiArrowUpSLine, RiErrorWarningFill } from 'react-icons/ri';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { IconCmd, Kbd } from '@/components/primitives/kbd';
import { cn } from '@/utils/ui';
import { DotGrid } from './copilot-thread-parts';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { deriveLauncherState, type LauncherState } from './copilot-web-chat-utils';

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(isOpen);

  // The popover unmounts on close; when it held the focus, the page would otherwise drop it to the body.
  useEffect(() => {
    const focused = document.activeElement;
    if (wasOpenRef.current && !isOpen && (!focused || focused === document.body)) buttonRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  if (isOpen) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={close}
        aria-label="Close Copilot"
        aria-haspopup="dialog"
        aria-expanded
        title="Close Copilot"
        className="fixed bottom-4 right-4 z-40 flex size-[38px] items-center justify-center rounded-full border border-stroke-soft bg-bg-white shadow-[0_8px_12px_rgba(15,23,41,0.04),0_1px_1px_rgba(15,23,41,0.04)] transition-colors hover:bg-bg-weak"
      >
        <BroomSparkle className="size-4" isAnimating={isBusy} />
      </button>
    );
  }

  const state = deriveLauncherState({
    isAvailable,
    isRunning: isBusy,
    hasError: hasRunError,
    hasUnseenAnswer,
  });
  const isOff = state === 'off';

  return (
    // Named by its visible text, so the status (Working…, Answer ready, Couldn’t finish) is read out with it.
    <button
      ref={buttonRef}
      type="button"
      disabled={isOff}
      onClick={() => open()}
      aria-haspopup="dialog"
      aria-expanded={false}
      aria-keyshortcuts={isOff ? undefined : 'Meta+J Control+J'}
      className={cn(
        'fixed bottom-4 right-4 z-40 flex h-[38px] items-center gap-2 rounded-full border border-stroke-soft py-2 pl-3 pr-2.5 transition-colors',
        isOff
          ? 'cursor-not-allowed bg-bg-weak'
          : 'bg-bg-white shadow-[0_8px_12px_rgba(15,23,41,0.04),0_1px_1px_rgba(15,23,41,0.04)] hover:bg-bg-weak'
      )}
    >
      <LauncherIcon state={state} />
      <span className={cn('text-label-sm', isOff ? 'text-text-soft' : 'text-text-strong')}>
        {isOff ? 'Copilot is off' : 'Ask Copilot'}
      </span>
      <LauncherStatus state={state} />
    </button>
  );
}
