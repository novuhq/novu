import { RiAddLine, RiCloseLine } from 'react-icons/ri';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { useCopilotPopoverTitle } from './copilot-popover-title';
import { CopilotThreadPanel } from './copilot-thread-panel';
import { useCopilotWebChat } from './copilot-web-chat-context';

function HeaderButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-6 items-center justify-center rounded-md text-text-soft hover:bg-bg-soft hover:text-text-strong disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function CopilotPopover() {
  const { isAvailable, isOpen, close, chat, startNewConversation, isBusy } = useCopilotWebChat();
  const title = useCopilotPopoverTitle(chat);

  if (!isOpen || !isAvailable) return null;

  return (
    <div
      role="dialog"
      aria-label="Novu Copilot"
      className="fixed bottom-[66px] right-4 z-40 flex h-[600px] max-h-[min(600px,calc(100vh-82px))] w-[400px] flex-col overflow-hidden rounded-xl border border-stroke-soft bg-bg-white shadow-[0_2px_4px_rgba(15,18,26,0.04),0_12px_32px_-8px_rgba(15,18,26,0.08)]"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stroke-soft bg-bg-weak pl-3.5 pr-2">
        <BroomSparkle className="size-4 shrink-0" isAnimating={isBusy} />
        <span className="min-w-0 flex-1 truncate text-label-sm text-text-sub">{title}</span>
        <HeaderButton label="New chat" disabled={!!chat?.isRunning} onClick={startNewConversation}>
          <RiAddLine className="size-3.5" />
        </HeaderButton>
        <HeaderButton label="Close" onClick={close}>
          <RiCloseLine className="size-3.5" />
        </HeaderButton>
      </div>
      <CopilotThreadPanel />
    </div>
  );
}
