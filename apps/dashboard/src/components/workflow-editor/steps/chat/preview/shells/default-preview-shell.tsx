import type { ReactNode } from 'react';

import { CardRenderer } from '../card-renderer';
import type { ChatShellProps } from './shell-types';

/**
 * Provider-agnostic default preview chrome (Figma `10980:11321`): a bordered card with a
 * weak-background header bar (Novu sender line + a right-aligned "DEFAULT PREVIEW" pill) over a
 * white message body. No avatar and no composer, so the preview reads as a neutral approximation
 * rather than any one platform's rendering.
 */
function DefaultPreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="border-stroke-soft pointer-events-none flex w-full flex-col overflow-clip rounded-md border">
      <div className="border-stroke-weak bg-bg-weak flex w-full items-center justify-between border-b px-2.5 py-2">
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
      <div className="bg-bg-white flex w-full flex-col p-2.5">{children}</div>
    </div>
  );
}

/**
 * Neutral chrome around the DSL content used for the "Default preview" option.
 */
export const DefaultPreviewShell = ({ card, children }: ChatShellProps) => {
  return <DefaultPreviewFrame>{card ? <CardRenderer card={card} /> : children}</DefaultPreviewFrame>;
};
