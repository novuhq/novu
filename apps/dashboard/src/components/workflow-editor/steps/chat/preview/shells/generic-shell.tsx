import { CardRenderer } from '../card-renderer';
import type { ChatShellProps } from './shell-types';

/**
 * Neutral chat chrome used for configured providers that do not yet have a dedicated shell.
 * Renders the same DSL card so the platform dropdown works before per-provider shells land.
 */
export const GenericShell = ({ card, children }: ChatShellProps) => {
  return (
    <div
      className="border-stroke-soft bg-bg-white pointer-events-none w-full rounded-lg border p-2.75"
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
          <span className="leading-5.5 mb-1 text-[15px] font-black text-[#1d1c1d]">Novu</span>
          {card ? <CardRenderer card={card} /> : children}
        </div>
      </div>
    </div>
  );
};
