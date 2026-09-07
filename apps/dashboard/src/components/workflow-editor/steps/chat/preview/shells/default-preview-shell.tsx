import type { ReactNode } from 'react';

import { cn } from '@/utils/ui';
import { CardRenderer } from '../card-renderer';
import type { ChatShellProps, ChatShellVariant } from './shell-types';

type DefaultPreviewFrameProps = {
  children: ReactNode;
  variant?: ChatShellVariant;
};

/**
 * Provider-agnostic default preview chrome (Figma `10980:11321`): a bordered card with a
 * weak-background header bar (Novu sender line + a right-aligned "DEFAULT PREVIEW" pill) over a
 * white message body. No avatar and no composer, so the preview reads as a neutral approximation
 * rather than any one platform's rendering.
 *
 * Mini (configure-step card) pins width/max-height and clips overflow so compiled card content —
 * including images — cannot spill outside the shell.
 */
function DefaultPreviewFrame({ children, variant = 'default' }: DefaultPreviewFrameProps) {
  const isMini = variant === 'mini';

  return (
    <div
      className={cn(
        'border-stroke-soft pointer-events-none flex w-full max-w-full flex-col overflow-clip rounded-md border',
        {
          'max-h-40': isMini,
        }
      )}
    >
      <div className="border-stroke-weak bg-bg-weak flex w-full shrink-0 items-center justify-between border-b px-2.5 py-2">
        <div className="flex items-center gap-1">
          <span className="text-text-strong text-[14px] font-medium leading-5 tracking-[-0.084px]">Novu</span>
          <span className="text-text-sub rounded-[3px] bg-[#f4f5f6] px-1 py-px text-[10px] font-normal leading-3.5 opacity-70">
            APP
          </span>
          <span className="text-text-sub text-[10px] font-normal leading-3.5 opacity-70">12:45</span>
        </div>
        <span className="text-text-sub rounded-[3px] bg-[#f4f5f6] px-1 py-px text-[10px] font-normal leading-3.5 opacity-70">
          DEFAULT PREVIEW
        </span>
      </div>
      <div
        className={cn('bg-bg-white flex w-full min-w-0 flex-col p-2.5', {
          'min-h-0 overflow-hidden': isMini,
        })}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Neutral chrome around the DSL content used for the "Default preview" option.
 */
export const DefaultPreviewShell = ({ card, children, variant = 'default' }: ChatShellProps) => {
  return <DefaultPreviewFrame variant={variant}>{card ? <CardRenderer card={card} /> : children}</DefaultPreviewFrame>;
};
