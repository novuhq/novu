import { useState } from 'react';
import { RiCloseLine, RiComputerLine, RiArrowRightLine } from 'react-icons/ri';
import { LogoCircle } from '@/components/icons/logo-circle';
import { cn } from '@/utils/ui';

const MOBILE_PROMPT_DISMISSED_KEY = 'novu-mobile-prompt-dismissed';

export function MobileDesktopPrompt() {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(MOBILE_PROMPT_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(MOBILE_PROMPT_DISMISSED_KEY, 'true');
    } catch {}
  };

  if (isDismissed) return null;

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in fixed inset-x-0 bottom-0 z-[100] p-3 duration-500 md:hidden">
      <div
        className={cn(
          'relative mx-auto max-w-md overflow-hidden rounded-2xl',
          'bg-background border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
        )}
      >
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Dismiss"
        >
          <RiCloseLine className="size-4" />
        </button>

        <div className="relative px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10">
              <LogoCircle className="size-5" />
            </div>
            <span className="text-sm font-semibold text-neutral-900">Novu</span>
          </div>

          <div className="mb-4">
            <h3 className="mb-1.5 text-base font-semibold text-neutral-900">Best on desktop</h3>
            <p className="text-sm leading-relaxed text-neutral-500">
              Novu's dashboard is designed for desktop screens. Switch to your computer for the full experience with
              workflow editing, code integration, and more.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-neutral-200/60">
              <RiComputerLine className="size-5 text-neutral-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-800">Open on your computer</p>
              <p className="truncate text-xs text-neutral-400">dashboard.novu.co</p>
            </div>
            <RiArrowRightLine className="size-4 shrink-0 text-neutral-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
