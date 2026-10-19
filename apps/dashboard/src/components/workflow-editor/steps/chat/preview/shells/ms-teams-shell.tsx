import type { ReactNode } from 'react';
import { RiSendPlane2Fill } from 'react-icons/ri';

import { CardRenderer } from '../card-renderer';
import type { ChatShellProps, ChatShellVariant } from './shell-types';

type MsTeamsPreviewFrameProps = {
  children: ReactNode;
  variant?: ChatShellVariant;
};

const TEAMS_FONT =
  '"Segoe UI", "Segoe UI Web", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif';

/**
 * Microsoft Teams message chrome: a rounded-square bot avatar, a muted sender/timestamp line, and
 * the message rendered inside its own bordered content card. The full preview also shows the Teams
 * compose bar. Colors follow Teams' desktop message list (`#242424` body, `#616161` meta).
 */
function MsTeamsPreviewFrame({ children, variant = 'default' }: MsTeamsPreviewFrameProps) {
  return (
    <div
      className="border-stroke-soft bg-bg-white pointer-events-none flex w-full flex-col gap-4 rounded-lg border p-2.75"
      style={{ fontFamily: TEAMS_FONT }}
    >
      <div className="flex w-full items-start">
        <img
          src="/images/chat-preview-novu-avatar.webp"
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="mt-5 mr-2.5 size-7 shrink-0 rounded-md object-cover border border-stroke-soft p-[2px] bg-[#fafafa]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1 max-w-[448px]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold leading-4 text-[#616161]">Novu</span>
            <span className="text-[12px] font-normal leading-4 text-[#616161]">10:50</span>
          </div>
          <div className="border-stroke-soft w-full rounded-lg border p-3 text-[#242424] bg-[#fafafa]">{children}</div>
        </div>
      </div>
      {variant === 'default' && (
        <div className="border-stroke-soft bg-[#f0f0f0] flex w-[calc(100%-2.25rem)] items-center justify-between gap-2 rounded-lg border px-3 py-2 opacity-70 mt-4 ml-9">
          <span className="text-[13px] font-normal leading-5 text-[#a19f9d]">Type a message</span>
          <RiSendPlane2Fill className="size-4 shrink-0 text-[#c8c6c4]" />
        </div>
      )}
    </div>
  );
}

/**
 * Teams-flavored chrome around the DSL content: the Novu bot sender line, a bordered message card,
 * and (in the full preview) the Teams compose bar.
 */
export const MsTeamsShell = ({ card, children, variant = 'default' }: ChatShellProps) => {
  return <MsTeamsPreviewFrame variant={variant}>{card ? <CardRenderer card={card} /> : children}</MsTeamsPreviewFrame>;
};
