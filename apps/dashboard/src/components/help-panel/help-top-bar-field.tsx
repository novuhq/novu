import { CircleHelp } from 'lucide-react';
import { HelpIconButton } from '@/components/header-navigation/help-icon-button';
import { useHelpPanel } from './help-panel-context';

export function HelpTopBarField() {
  const { isOpen, openHelpPanel, registerAnchor } = useHelpPanel();
  const triggerProps = {
    ref: registerAnchor,
    'aria-haspopup': 'dialog',
    'aria-expanded': isOpen,
    onClick: () => openHelpPanel('header'),
  } as const;

  return (
    <>
      <button
        {...triggerProps}
        type="button"
        aria-keyshortcuts="?"
        className="hidden h-7 items-center gap-1.5 rounded-8 border border-stroke-soft bg-bg-weak px-2 text-left outline-none transition-colors hover:border-stroke-sub focus-visible:border-stroke-sub focus-visible:ring-2 focus-visible:ring-ring aria-expanded:border-stroke-sub aria-expanded:bg-bg-white md:flex"
      >
        <CircleHelp aria-hidden strokeWidth={2} className="size-4 shrink-0 text-text-sub" />
        <span className="whitespace-nowrap text-[13px] font-medium leading-none text-text-sub">Need a hand</span>
      </button>
      <HelpIconButton {...triggerProps} className="md:hidden" />
    </>
  );
}
