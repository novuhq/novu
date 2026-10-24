import { CircleHelp } from 'lucide-react';
import { HelpIconButton } from '@/components/header-navigation/help-icon-button';
import { Kbd } from '@/components/primitives/kbd';
import { useHelpPanel } from './help-panel-context';
import { HELP_PANEL_SHORTCUT_LABEL } from './help-panel-shortcut';

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
        className="hidden h-7 items-center gap-1.5 rounded-8 border border-stroke-soft bg-bg-weak pl-2 pr-1 text-left outline-none transition-colors hover:border-stroke-sub focus-visible:border-stroke-sub focus-visible:ring-2 focus-visible:ring-ring aria-expanded:border-stroke-sub aria-expanded:bg-bg-white md:flex"
      >
        <CircleHelp aria-hidden strokeWidth={2} className="size-4 shrink-0 text-text-sub" />
        <span className="whitespace-nowrap text-[13px] font-medium leading-none text-text-soft">Need a hand</span>
        <Kbd variant="flat" className="border-stroke-soft/60 bg-bg-weak text-text-soft">
          {HELP_PANEL_SHORTCUT_LABEL}
        </Kbd>
      </button>
      <HelpIconButton {...triggerProps} className="md:hidden" />
    </>
  );
}
