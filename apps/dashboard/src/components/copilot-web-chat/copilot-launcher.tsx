import { RiArrowUpSLine, RiErrorWarningFill } from 'react-icons/ri';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { IconCmd, Kbd } from '@/components/primitives/kbd';
import { cn } from '@/utils/ui';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { deriveLauncherState, type LauncherState } from './copilot-web-chat-utils';

const DOT_DELAYS = [0, 120, 240, 120, 240, 360, 240, 360, 480];

function DotGrid() {
  return (
    <span className="grid size-4 shrink-0 grid-cols-3 place-content-center gap-[2px]" aria-hidden="true">
      {DOT_DELAYS.map((delay, index) => (
        <span
          key={index}
          className="size-[3px] animate-pulse rounded-full bg-text-soft"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

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
    default:
      return (
        <Kbd className="gap-0.5 px-1.5">
          <IconCmd className="size-2.5" />
          <span>J</span>
        </Kbd>
      );
  }
}

export function CopilotLauncher() {
  const { isAvailable, isOpen, open, chat, hasUnseenAnswer, hasRunError } = useCopilotWebChat();

  if (isOpen) return null;

  const state = deriveLauncherState({
    isAvailable,
    isRunning: !!chat?.isRunning,
    hasError: hasRunError,
    hasUnseenAnswer,
  });
  const isOff = state === 'off';

  return (
    <button
      type="button"
      disabled={isOff}
      onClick={open}
      aria-label={isOff ? 'Copilot is off' : 'Ask Copilot'}
      className={cn(
        'fixed bottom-4 right-4 z-40 flex h-[38px] items-center gap-2 rounded-full border border-stroke-soft py-2 pl-3 pr-2.5 transition-colors',
        isOff
          ? 'cursor-not-allowed bg-bg-weak'
          : 'bg-bg-white shadow-[0_8px_12px_rgba(15,23,41,0.04),0_1px_1px_rgba(15,23,41,0.04)] hover:bg-bg-weak'
      )}
    >
      {state === 'working' ? (
        <DotGrid />
      ) : state === 'error' ? (
        <RiErrorWarningFill className="size-4 text-error-base" />
      ) : (
        <BroomSparkle className={cn('size-4', isOff && 'opacity-50')} />
      )}
      <span className={cn('text-label-sm', isOff ? 'text-text-soft' : 'text-text-strong')}>
        {isOff ? 'Copilot is off' : 'Ask Copilot'}
      </span>
      <LauncherStatus state={state} />
    </button>
  );
}
