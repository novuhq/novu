import { CornerDownRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { type BuildingBlockVisual, BUILDING_BLOCK_VISUALS as visuals } from '@/data/sapien-building-blocks';
import { cn } from '@/lib/utils';

import { ChannelLogo } from './brand-logo';
import { AgentFace, PersonFace } from './person-face';

export const sceneSurface =
  'rounded-xl border border-sapien-surface bg-[#161412] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_32px_-16px_rgba(0,0,0,0.9)]';
const mono = 'font-sapien-mono text-[11px] leading-none tracking-tight';
/** Moves an item `--i` steps out from the middle of its row while the card is hovered. */
const spread =
  'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:translate-x-[calc(var(--i)*6px)] motion-reduce:transition-none';

/** The agent's avatar in the scenes: the dashboard's dithered mascot, at the letter-circle's size. */
function AgentDot({ className }: { className?: string }) {
  return <AgentFace className={className} />;
}

/** A person, tinted from their name, in place of an initial. */
function PersonDot({ seed, className }: { seed: string; className?: string }) {
  return <PersonFace seed={seed} className={className} />;
}

/** Registration marks at the stage's corners, as on a print sheet. */
function CornerMarks() {
  const mark = 'absolute size-2.5 border-sapien-foreground/20';

  return (
    <>
      <span className={cn(mark, 'top-3 left-3 border-t border-l')} />
      <span className={cn(mark, 'top-3 right-3 border-t border-r')} />
      <span className={cn(mark, 'bottom-3 left-3 border-b border-l')} />
      <span className={cn(mark, 'right-3 bottom-3 border-r border-b')} />
    </>
  );
}

/** A card's stage: dot grid, a warm light from above and print marks, around a scene in the product's own UI. */
export function BuildingBlockStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex h-60 items-center justify-center overflow-hidden border-b border-sapien-border bg-[#0b0a09] px-6 select-none',
        className
      )}
    >
      {/* Faded out towards the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(238,229,216,0.09)_1px,transparent_1.2px)] bg-size-[12px_12px] [mask-image:radial-gradient(70%_70%_at_50%_45%,#000_20%,transparent_100%)]" />
      <div className="absolute -top-1/2 left-1/2 h-full w-3/4 -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,92,48,0.16)_0%,transparent_70%)] transition-transform duration-500 group-hover/card:scale-125 motion-reduce:transition-none" />
      <CornerMarks />
      <div className="relative flex w-full justify-center transition-transform duration-300 ease-out group-hover/card:-translate-y-1 motion-reduce:transition-none">
        {children}
      </div>
    </div>
  );
}

/** The stage at the top of a feature card. Its text repeats what the card says. */
export function BuildingBlockVisualScene({ visual, className }: { visual: BuildingBlockVisual; className?: string }) {
  return (
    <BuildingBlockStage className={className}>
      <div aria-hidden="true" className="flex w-full justify-center">
        <Scene visual={visual} />
      </div>
    </BuildingBlockStage>
  );
}

function Scene({ visual }: { visual: BuildingBlockVisual }) {
  switch (visual) {
    case 'messaging':
      return (
        <div className="flex w-full max-w-88 flex-col gap-3">
          <div className="flex items-end gap-2">
            <PersonDot seed={visuals.messaging.incoming.from} className="size-7" />
            <div className={cn(sceneSurface, 'rounded-bl-sm px-3.5 py-2.5')}>
              <p className={cn(mono, 'mb-1.5 flex items-center gap-1.5 text-sapien-foreground/45')}>
                <ChannelLogo channel="email" size={14} />
                {visuals.messaging.incoming.from}
              </p>
              <p className="text-[14px] leading-[1.3] text-sapien-foreground/85">{visuals.messaging.incoming.text}</p>
            </div>
          </div>
          <div className="flex items-end justify-end gap-2">
            <div className="rounded-xl rounded-br-sm border border-accent/30 bg-[linear-gradient(180deg,rgba(255,92,48,0.16),rgba(255,92,48,0.07))] px-3.5 py-2.5">
              <p className={cn(mono, 'mb-1.5 text-accent')}>{visuals.messaging.reply.from}</p>
              <p className="text-[14px] leading-[1.3] text-sapien-foreground">{visuals.messaging.reply.text}</p>
            </div>
            <AgentDot className="size-7" />
          </div>
        </div>
      );
    case 'history':
      return (
        <ul className={cn(sceneSurface, 'w-full max-w-76 divide-y divide-sapien-surface px-3.5')}>
          {visuals.history.map((row, index) => (
            <li
              key={row.who}
              className="flex items-center gap-2.5 py-2.5 transition-transform duration-300 ease-out group-hover/card:translate-x-1 motion-reduce:transition-none"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <ChannelLogo channel={row.channel} size={16} />
              <span className="shrink-0 text-[13px] leading-none whitespace-nowrap text-sapien-foreground/85">
                {row.who}
              </span>
              <span className="min-w-0 truncate text-[13px] leading-none text-sapien-foreground/40">{row.text}</span>
              <span className={cn(mono, 'ml-auto shrink-0 text-sapien-foreground/30')}>{row.time}</span>
            </li>
          ))}
        </ul>
      );
    case 'contacts':
      return (
        <div className="flex flex-col items-center gap-5">
          {/* Each face sits above the next, so its channel badge is never covered. On hover the stack
              spreads out from its middle. */}
          <div className="flex items-center">
            {visuals.contacts.map((name, index) => (
              <span
                key={name}
                className={cn(spread, 'relative not-first:-ml-3')}
                style={{ zIndex: visuals.contacts.length - index, '--i': index - 2 } as CSSProperties}
              >
                <PersonDot seed={name} className="size-12 ring-[3px] ring-[#0b0a09]" />
                <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-[#0b0a09]">
                  <ChannelLogo channel={visuals.contactChannels[index] ?? 'email'} size={16} />
                </span>
              </span>
            ))}
            <span
              className={cn(
                mono,
                spread,
                '-ml-3 flex size-12 items-center justify-center rounded-full border border-sapien-surface bg-[#161412] text-sapien-foreground/50 ring-[3px] ring-[#0b0a09]'
              )}
              style={{ '--i': 2 } as CSSProperties}
            >
              {visuals.contactsMore}
            </span>
          </div>
          <p className={cn(mono, 'flex items-center gap-1.5 text-sapien-foreground/40')}>
            <CornerDownRight className="size-3" strokeWidth={2} />
            {visuals.contactsNote}
          </p>
        </div>
      );
    default: {
      const unhandled: never = visual;

      return unhandled;
    }
  }
}
