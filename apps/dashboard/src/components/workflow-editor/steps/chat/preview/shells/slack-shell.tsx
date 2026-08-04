import type { ReactNode } from 'react';

import { CardRenderer } from '../card-renderer';
import type { ChatShellProps, ChatShellVariant } from './shell-types';

type SlackPreviewFrameProps = {
  children: ReactNode;
  variant?: ChatShellVariant;
};

/**
 * Slack message chrome: app icon/sender line (Block Kit Builder) plus the Figma Message Box
 * composer (`10415:19564`) used in the full preview.
 */
export function SlackPreviewFrame({ children, variant = 'default' }: SlackPreviewFrameProps) {
  return (
    <div
      className="border-stroke-soft bg-bg-white pointer-events-none flex w-full flex-col gap-5 rounded-lg border p-2.75"
      style={{ fontFamily: 'Lato, Slack-Lato, "Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      <div className="flex w-full items-start">
        <img
          src="/images/chat-preview-novu-avatar.webp"
          alt=""
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="mr-2 size-9 shrink-0 object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-1 flex items-center">
            <span className="leading-5.5 mr-1.25 text-[15px] font-black text-[#1d1c1d]">Novu</span>
            <span className="mr-1.25 rounded-xs bg-[rgba(29,28,29,0.06)] px-0.75 py-px text-[10px] font-bold leading-[12.5px] text-[#454447]">
              APP
            </span>
            <span className="text-xs font-normal leading-[17.6px] text-[#616061]">12:45</span>
          </div>
          {children}
        </div>
      </div>

      {variant === 'default' && (
        <div
          className="border-stroke-soft bg-bg-white w-full rounded border"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <div className="flex w-full items-center justify-between px-2 py-1">
            <span className="text-label-xs text-text-disabled font-medium">Jot something down</span>
            <img
              src="/images/chat-preview-send-fill.svg"
              alt=""
              width={12}
              height={12}
              draggable={false}
              className="size-3 shrink-0"
            />
          </div>
          <div className="h-5.5 w-full rounded-b-lg" />
        </div>
      )}
    </div>
  );
}

/**
 * Slack-flavored chrome around the DSL content: the Novu app sender line and (in the full preview)
 * the Slack message composer. Message body styles match Block Kit Builder measurements.
 */
export const SlackShell = ({ card, children, variant = 'default' }: ChatShellProps) => {
  return <SlackPreviewFrame variant={variant}>{card ? <CardRenderer card={card} /> : children}</SlackPreviewFrame>;
};
