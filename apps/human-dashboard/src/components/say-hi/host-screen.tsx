'use client';

import { Fragment, useEffect, useId, useRef, useTransition } from 'react';

import { pickHostAction } from '@/app/(account)/onboarding/actions';
import { HostLogo } from '@/components/connect/host-logo';
import { Button } from '@/components/ui/button';
import { type HostId, hostOf, PICKER_RUNS } from '@/lib/hosts';
import { cn } from '@/lib/utils';

import { type MascotShadow, MascotSlot, SpotlightSlot } from './mascot-stage';
import { KeyHints, ScreenLead, ScreenSpace, ScreenTitle, useShortcut } from './parts';

/** The dock's runs under the design's labels; Other (MCP) comes after them on its own, unlabelled. */
/**
 * The mascot's shadow on A.2, the design's 110×18 oval: centred under the middle of the screen, with the mascot
 * sitting 10.5px to its right, and 87.9% of the way down it (shares of its 252px).
 */
const GROUND_SHADOW: MascotShadow = { left: 0.5 - 0.4365 / 2 - 10.5 / 252, top: 0.879, width: 0.4365 };

const RUNS = [
  { label: 'In a chat app', hosts: PICKER_RUNS[0] },
  { label: 'In your editor', hosts: PICKER_RUNS[1] },
  { label: 'On your server', hosts: PICKER_RUNS[2].filter((id) => id !== 'general') },
];

/** Every host in the order the arrow keys walk them. */
const ALL: readonly HostId[] = [...RUNS.flatMap((run) => run.hosts), 'general'];

/** As the tile names them: General is any other app that speaks MCP. */
export function tileNameOf(id: HostId): string {
  return id === 'general' ? 'Other (MCP)' : hostOf(id).name;
}

type HostScreenProps = {
  agent: { name: string };
  host: HostId;
  onHostChange: (host: HostId) => void;
};

/**
 * A.2 · Where does it live? The hosts Agent Inbox has steps for, in the design's `Agent dock`: its three runs, then
 * Other (MCP), the chosen one outlined in orange. The arrow keys move along them and Enter goes on to connecting the
 * chosen one. Where the window is too narrow for the dock, it scrolls sideways, with no scrollbar.
 */
export function HostScreen({ host, onHostChange }: HostScreenProps) {
  const [going, startGoing] = useTransition();
  const group = useId();
  const dock = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const move = (by: number) => onHostChange(ALL[(ALL.indexOf(host) + by + ALL.length) % ALL.length]);
  const go = () => startGoing(() => pickHostAction(host));

  useShortcut('ArrowLeft', () => move(-1));
  useShortcut('ArrowRight', () => move(1));
  useShortcut('Enter', go, { enabled: !going });

  // A tile chosen with the keys comes into view on a narrow screen. Not on arrival: the dock starts at its start.
  useEffect(() => {
    if (!shown.current) {
      shown.current = true;
      return;
    }

    dock.current
      ?.querySelector<HTMLElement>(`[data-host="${host}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [host]);

  const tile = (id: HostId) => {
    const picked = host === id;

    return (
      <label
        key={id}
        data-host={id}
        onDoubleClick={go}
        // Every tile has its border, see-through until picked, inside the design's 12px/9px padding, and keeps room
        // for its name in the picked tile's heavier weight: either one changing with the pick moved the whole row.
        className={cn(
          'flex shrink-0 cursor-pointer snap-center flex-col items-center gap-1.75 rounded-[14px] border px-2.75 pt-2.75 pb-2 text-[11px] leading-3.5 whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-200',
          // Focus from the keyboard brightens the tile's own border, with the name field's glow: a ring of its own
          // around the picked tile's border showed as a double border.
          'has-focus-visible:border-accent has-focus-visible:shadow-[0_0_0_3px_rgb(255_92_48/0.18)]',
          picked
            ? 'border-accent/60 bg-accent/10 text-foreground'
            : 'border-transparent text-secondary hover:bg-foreground/4 hover:text-foreground'
        )}
      >
        <input
          type="radio"
          name={group}
          value={id}
          checked={picked}
          onChange={() => onHostChange(id)}
          className="sr-only"
        />
        <HostLogo host={hostOf(id)} size="dock" />
        <span className="grid">
          <span className={cn('col-start-1 row-start-1 text-center', picked && 'font-medium')}>{tileNameOf(id)}</span>
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-medium">
            {tileNameOf(id)}
          </span>
        </span>
      </label>
    );
  };

  return (
    <ScreenSpace above={184.5} below={94}>
      <div className="relative flex flex-col items-center">
        <SpotlightSlot opacity={0.24} className="top-[-284.5px] left-[calc(50%-500px)]" />
        <MascotSlot
          bubble="Hi! Where do I live?"
          mood="asleep"
          shadow={GROUND_SHADOW}
          className="relative left-[10.5px] w-40 lg:w-63"
        />
      </div>
      <ScreenTitle className="mt-[23.5px]">Where does your agent live?</ScreenTitle>
      <ScreenLead className="mt-2 px-4">
        We connect to the agent you already use. It keeps its brain, we give it an inbox.
      </ScreenLead>

      {/* Room above and below the dock for its shadow, which a scrolling box would otherwise cut off. */}
      <div
        ref={dock}
        className="-mx-4 mt-2.5 -mb-10 flex w-[calc(100%+2rem)] snap-x snap-proximity overflow-x-auto px-4 pt-7 pb-17 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          role="radiogroup"
          aria-label="Where your agent lives"
          className="mx-auto flex shrink-0 items-end gap-1.5 rounded-[20px] border border-border-strong bg-raised p-3 shadow-[0_20px_46px_0_rgb(0_0_0/0.55)]"
        >
          {RUNS.map((run, index) => (
            <Fragment key={run.label}>
              {index > 0 && <span aria-hidden="true" className="h-18 w-px shrink-0 bg-border-strong" />}
              <div className="flex flex-col items-center gap-1.5">
                <p className="font-mono text-[9px] leading-3 font-medium text-muted uppercase">{run.label}</p>
                <div className="flex items-start gap-1">{run.hosts.map(tile)}</div>
              </div>
            </Fragment>
          ))}
          {tile('general')}
        </div>
      </div>

      <Button onClick={go} pending={going}>
        Continue with {tileNameOf(host)}
      </Button>
      <div className="mt-5">
        <KeyHints
          hints={[
            { keys: ['left', 'right'], label: 'choose' },
            { keys: ['enter'], label: 'continue' },
          ]}
        />
      </div>
    </ScreenSpace>
  );
}
