'use client';

import { Bot, Pencil, Terminal } from 'lucide-react';
import type { ReactNode } from 'react';
import QRCode from 'react-qr-code';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { CornerTicks } from '@/components/onboarding/onboarding-shell';
import { SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { MascotFace, useBeaming } from '@/components/ui/mascot-face';
import { AI_TOOLS } from '@/lib/ai-tools';
import { HOST_LABELS, type HostVia, PLACEHOLDER_NAME, writtenLink } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

/**
 * How far the agent's identity got:
 * - `draft`: being named on step 1, nothing exists yet;
 * - `issued`: it has its address;
 * - `waiting`: the same, with the slot for a host shown empty above it;
 * - `connected`: a host reads its mail.
 */
export type IdentityState = 'draft' | 'issued' | 'waiting' | 'connected';

type IdentityStageProps = {
  state: IdentityState;
  /** Empty while the operator hasn't typed a name yet. */
  name: string;
  /** The line under the name: whose agent it is and since when. */
  subtitle: ReactNode;
  address: string;
  /** The public card's link, `https://agentinbox.md/p/atlas` (`cardLinkOf`). Shown as `writtenLink` writes it. */
  cardLink: string;
  telegramConnected?: boolean;
  /** Mail has landed in the agent's inbox, which wakes the mascot up before any host is there. */
  gotMail?: boolean;
  /** How the host connected, once one has. */
  hostVia?: HostVia;
  /** The caption in the corner of the stage, such as "fig. 01  naming". */
  caption: string;
};

/**
 * Where the card sits on the stage and how far it leans: 2° through the first three steps, straight once
 * a host has connected. The design leans the draft 4°; it leans like the next two here, around the same
 * middle, so it doesn't turn as it moves on.
 *
 * The design places a leaning card by the box around it (66px from the top while it is a draft, 111px
 * once issued, 130px while waiting). The card here turns around its own middle, so `top` and `left` are
 * those places worked out for the card before it turns: 78, 117, 136 and 169.5px from the top.
 *
 * The stage is as tall as the tallest step, taller than any frame of the design, so each of those places
 * is kept as a distance from the middle of the stage. In a stage as tall as its frame (600, 676, 644 and
 * 679px) the card is exactly where the design has it; in a taller one it stays as centered as it was.
 * The slot above the card and the ring behind it are placed the same way.
 */
const CARD_POSE: Record<IdentityState, string> = {
  draft: 'top-[calc(var(--mid)-222px)] left-[33.5px] rotate-2',
  issued: 'top-[calc(var(--mid)-221px)] left-[38px] rotate-2',
  waiting: 'top-[calc(var(--mid)-186px)] left-[41px] rotate-2',
  connected: 'top-[calc(var(--mid)-170px)] left-[39px]',
};

/**
 * The card's own border and shadow. Connected, it gets an orange border and a glow, and both wait for
 * their turn: the host's pill is outlined first, then the line comes down to the card (1.6s in all, see
 * `ConnectedSlot`). The orange border is `CardOutline`, which draws itself over the gray one; the gray
 * one goes once it is covered, and the glow comes up as the drawing starts.
 */
const CARD_LOOK: Record<IdentityState, string> = {
  draft: 'border-dashed border-border-strong',
  issued: 'border-border-strong',
  waiting: 'border-border-strong',
  connected:
    'border-transparent shadow-[0_24px_48px_rgb(0_0_0/0.55),0_0_40px_rgb(255_92_48/0.22)] [transition-delay:2.7s,1.6s]',
};

/**
 * The middle of the stage, which everything on it is placed from, as `--mid`: half its height, taken
 * down to a whole pixel where the browser can do that. A stage of an odd height has its middle on half
 * a pixel, and the lines drawn on it (`CardOutline`, the host's pill) would blur across two rows.
 */
const MIDDLE = '[--mid:50%] supports-[top:round(down,50%,1px)]:[--mid:round(down,50%,1px)]';

/** How far above the bottom of the stage its caption stands in each of the design's frames. */
const CAPTION_PLACE: Record<IdentityState, string> = {
  draft: 'bottom-3',
  issued: 'bottom-4.5',
  waiting: 'bottom-4.5',
  connected: 'bottom-3.5',
};

const PORTRAIT_CAPTION: Partial<Record<IdentityState, string>> = {
  issued: 'fig. 02  issued, not connected',
  waiting: 'fig. 03  waiting for your agent',
};

/**
 * What comes and goes on the stage fades, in the time the card takes to move to its next place. Something
 * that has faded out is hidden as well, so it is neither painted nor read out.
 */
const FADES = 'transition-[opacity,visibility] duration-700 ease-out motion-reduce:transition-none';
const FADED_OUT = 'invisible opacity-0';

/**
 * The slow swell of the dither elsewhere in the dashboard, for the illustrations here. It goes on a box
 * around a picture, never on the picture: that one's own opacity is its strength in the design, and the
 * swell would take its place.
 */
const BREATHES = 'animate-breathe motion-reduce:animate-none';

/**
 * The right column of the onboarding card: the agent's identity card on its stage. One card for all four
 * steps, so it moves from one state to the next instead of being swapped.
 */
export function IdentityStage({
  state,
  name,
  subtitle,
  address,
  cardLink,
  telegramConnected = false,
  gotMail = false,
  hostVia,
  caption,
}: IdentityStageProps) {
  const draft = state === 'draft';

  return (
    <div
      className={cn(
        'absolute inset-0 isolate transition-colors duration-700 motion-reduce:transition-none',
        MIDDLE,
        draft ? 'bg-background' : 'bg-subtle'
      )}
    >
      <StageTexture state={state} />
      <Slot shown={state === 'waiting'}>
        <WaitingSlot />
      </Slot>
      <Slot shown={state === 'connected'}>
        <ConnectedSlot via={hostVia ?? 'cli'} shown={state === 'connected'} />
      </Slot>

      <div
        className={cn(
          'absolute w-90 transition-[top,left,rotate] duration-700 ease-out motion-reduce:transition-none',
          CARD_POSE[state]
        )}
      >
        <div
          className={cn(
            'overflow-hidden rounded-[14px] border bg-background shadow-[0_24px_48px_rgb(0_0_0/0.55)]',
            'transition-[border-color,box-shadow] duration-700 ease-out motion-reduce:transition-none',
            CARD_LOOK[state]
          )}
        >
          <Portrait state={state} name={name} address={address} gotMail={gotMail} />

          <div className="flex flex-col items-center gap-1 px-5 pt-4 pb-3 text-center">
            <p className="flex max-w-full items-center">
              <span
                className={cn(
                  'truncate text-[22px] leading-7 font-medium tracking-[-0.3px] transition-colors duration-300 motion-reduce:transition-none',
                  name ? 'text-foreground' : 'text-muted'
                )}
              >
                {name || PLACEHOLDER_NAME}
              </span>
              {/* The pencil folds away with the draft, so the name slides to the middle instead of jumping there. */}
              <span
                aria-hidden="true"
                className={cn(
                  'flex shrink-0 justify-end overflow-hidden transition-[width,opacity] duration-500 ease-out motion-reduce:transition-none',
                  draft ? 'w-5.25' : 'w-0 opacity-0'
                )}
              >
                <Pencil className="size-3.25 shrink-0 text-muted" strokeWidth={1.5} />
              </span>
            </p>
            <p
              key={draft ? 'draft' : 'made'}
              className="animate-overlay-in text-xs leading-4 text-secondary motion-reduce:animate-none"
            >
              {subtitle}
            </p>
          </div>

          <IdentityRows state={state} address={address} telegramConnected={telegramConnected} />

          {/* 41px with the link alone, 53px once the button to copy it is there: it grows to make room. */}
          <div
            className={cn(
              'flex items-center gap-2 border-t border-border px-3.5 transition-[height] duration-700 ease-out motion-reduce:transition-none',
              draft ? 'h-10.25' : 'h-13.25'
            )}
          >
            <p
              className={cn(
                'min-w-0 truncate font-mono text-xs leading-4 transition-colors duration-500 motion-reduce:transition-none',
                draft ? 'text-muted' : 'text-default'
              )}
            >
              {writtenLink(cardLink)}
            </p>
            {!draft && (
              <CopyButton
                value={cardLink}
                label="Copy the link to the agent's card"
                variant="quiet"
                className={cn(SMALL_BUTTON, 'ml-auto animate-overlay-in text-foreground motion-reduce:animate-none')}
              >
                Copy link
              </CopyButton>
            )}
          </div>
        </div>
        {state === 'connected' && <CardOutline />}
      </div>

      {/* A new key per caption: the next one fades in where it belongs. */}
      <p
        key={caption}
        className={cn(
          'absolute left-[15px] animate-overlay-in font-mono text-[10px] leading-3.5 whitespace-pre text-muted motion-reduce:animate-none',
          CAPTION_PLACE[state]
        )}
      >
        {caption}
      </p>
    </div>
  );
}

/**
 * How the mascot looks in each state: dim and thinking, asleep while nothing happens. With a host it is
 * awake, and happy for a moment every now and then: see `useBeaming`.
 */
const MASCOT_MOOD = { draft: 'awake', issued: 'asleep', waiting: 'asleep', connected: 'awake' } as const;

/**
 * Where the mascot stands in the portrait, 120px across: the size of its grid, so a cell is one pixel.
 * At any other size some columns of cells come out a pixel wider than the rest, and one eye wider than
 * the other with them.
 */
const FACE = 'absolute top-10 left-1/2 size-30 -translate-x-1/2';

type PortraitProps = Pick<IdentityStageProps, 'state' | 'name' | 'address'> & { gotMail: boolean };

/**
 * The top of the card: the mascot on its dither, with the labels of an ID photo around it, and a code to
 * scan that starts an email to the agent once it has its address.
 */
function Portrait({ state, name, address, gotMail }: PortraitProps) {
  const draft = state === 'draft';
  const connected = state === 'connected';
  const beaming = useBeaming(connected);
  // The first mail to land wakes it up, on the step that waits for that mail.
  const mood = beaming ? 'happy' : state === 'issued' && gotMail ? 'awake' : MASCOT_MOOD[state];
  const caption = draft ? null : (PORTRAIT_CAPTION[state] ?? `fig. 04  ${name}`);

  return (
    <div className="relative isolate h-50 overflow-hidden bg-subtle">
      {/*
        `Deco/Callout dither` at its own size, against the top right corner of the card, border included.
        The box around it breathes, in step with the stage behind the card, so the picture keeps the
        strength its state gives it and swells up to that.
      */}
      <div className={cn('pointer-events-none absolute inset-0 -z-10', BREATHES)}>
        <img
          src="/illustrations/dither-callout.svg"
          alt=""
          width={560}
          height={320}
          className={cn(
            'absolute top-0 -right-px h-80 w-140 max-w-none transition-opacity duration-700 select-none',
            draft ? 'opacity-25' : 'opacity-55'
          )}
        />
      </div>
      <CornerTicks />
      <p className="absolute top-3.5 left-4 font-mono text-[10px] leading-3.5 font-medium tracking-[0.8px] text-muted">
        AGENT CARD
      </p>
      <PortraitChip shown={state === 'connected'} dot="bg-success">
        active
      </PortraitChip>
      {/*
        While the agent is only a draft, the mascot is the design's own drawing of it and nothing else: a
        picture that is there with the page and never changes, a reload included. It fades out under the
        drawn mascot once the agent exists.
      */}
      <img
        src="/illustrations/mascot-waiting.svg"
        alt=""
        width={120}
        height={120}
        className={cn(FACE, 'select-none', FADES, draft ? 'opacity-45' : FADED_OUT)}
      />
      {/*
        Two drawn faces, one over the other: the sleeping one, and the one that is awake. They fade into
        each other. The waking one looks straight ahead, follows the pointer and blinks, and turns its
        eyes happy and back by itself: see `MascotFace`. Both are drawn at one screen pixel to a cell of
        their grid, so the two eyes come out as the same shape.
      */}
      {!draft && (
        <>
          <MascotFace
            art="waiting"
            mood="asleep"
            drawnOnly
            className={cn(FACE, FADES, mood !== 'asleep' && FADED_OUT)}
          />
          <MascotFace
            art="waiting"
            mood={mood === 'happy' ? 'happy' : 'awake'}
            ahead
            drawnOnly
            still={mood === 'asleep'}
            className={cn(FACE, FADES, mood === 'asleep' && FADED_OUT)}
          />
        </>
      )}
      {/* Light on the dark portrait, as in the design: `Icon · 44×44`, 16px from the right, 4px from the bottom. */}
      {!draft && (
        <QRCode
          value={`mailto:${address}`}
          size={44}
          level="L"
          bgColor="transparent"
          fgColor="#ebe2d6"
          aria-label={`QR code that starts an email to ${address}`}
          className="absolute right-4 bottom-1 animate-overlay-in motion-reduce:animate-none"
        />
      )}
      {caption && (
        <p
          key={caption}
          className={cn(
            'absolute bottom-1.5 left-4 animate-overlay-in font-mono text-[10px] leading-3.5 whitespace-pre text-muted motion-reduce:animate-none',
            state === 'connected' && 'uppercase'
          )}
        >
          {caption}
        </p>
      )}
    </div>
  );
}

function PortraitChip({ shown, dot, children }: { shown: boolean; dot: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        'absolute top-3 right-3 flex items-center gap-1.5 rounded bg-background/70 px-2 py-0.75 font-mono text-[11px] leading-3.5 text-default',
        FADES,
        !shown && FADED_OUT
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />
      {children}
    </p>
  );
}

type IdentityRowsProps = Pick<IdentityStageProps, 'state' | 'address'> & { telegramConnected: boolean };

/** What the agent has so far, one line each: its address, its host, and Telegram as the next channel. */
function IdentityRows({ state, address, telegramConnected }: IdentityRowsProps) {
  const draft = state === 'draft';
  const connected = state === 'connected';

  return (
    <ul className="flex flex-col px-3 pb-2">
      <IdentityRow
        icon={<ChannelIcon via="email" className="size-4 [&>svg]:size-2.25" />}
        label={address}
        live={!draft}
        status={draft ? <Pending /> : <Live>active</Live>}
      />
      <IdentityRow
        icon={
          <span className="flex size-4 items-center justify-center rounded border border-border-strong bg-raised">
            <Bot className="size-2.5 text-muted" strokeWidth={1.33} />
          </span>
        }
        label={connected ? 'agent' : 'Not connected'}
        live={connected}
        highlighted={connected}
        status={
          <>
            {draft && <Pending />}
            {connected && <Live>connected</Live>}
          </>
        }
      />
      <IdentityRow
        icon={<ChannelIcon via="telegram" className="size-4 [&>svg]:size-2.5" />}
        label={telegramConnected ? 'Telegram' : 'Not set up'}
        live={telegramConnected}
        status={telegramConnected ? <Live>active</Live> : <Pending />}
      />
    </ul>
  );
}

type IdentityRowProps = {
  icon: ReactNode;
  label: string;
  /** Whether this part of the agent works yet. What doesn't is written in a quieter color. */
  live: boolean;
  highlighted?: boolean;
  status: ReactNode;
};

function IdentityRow({ icon, label, live, highlighted = false, status }: IdentityRowProps) {
  return (
    <li
      className={cn(
        'flex h-8.5 items-center gap-2.5 rounded-md px-2 transition-colors duration-500 motion-reduce:transition-none',
        highlighted && 'bg-subtle'
      )}
    >
      {icon}
      {/* A part that starts to work gets its new words faded in. What is typed on step 1 just follows. */}
      <span
        key={live ? 'live' : 'not-yet'}
        className={cn(
          'min-w-0 flex-1 truncate font-mono text-xs leading-4',
          live ? 'animate-overlay-in text-foreground motion-reduce:animate-none' : 'text-muted'
        )}
      >
        {label}
      </span>
      {status}
    </li>
  );
}

/** The empty ring at the end of a row that has nothing to show yet. */
function Pending() {
  return <span aria-hidden="true" className="size-1.75 shrink-0 rounded-full border-[1.2px] border-muted" />;
}

function Live({ children }: { children: ReactNode }) {
  return (
    <span className="flex shrink-0 animate-overlay-in items-center gap-1.25 font-mono text-[11px] leading-3.5 text-secondary motion-reduce:animate-none">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
      {children}
    </span>
  );
}

/**
 * The illustrations behind the card: the design's own drawings, at the size and strength each frame shows
 * them. All of them are there from the start and the ones of the moment are faded in, so a step never
 * waits for its picture to load and one background turns into the next.
 *
 * The draft and the issued state have none: their stage is bare behind the card. The ring of the
 * connected state breathes; the dither of the waiting state stands still.
 */
function StageTexture({ state }: { state: IdentityState }) {
  const layer = cn('absolute max-w-none select-none', FADES);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Waiting. This dither stands still; on that step only the one in the card breathes. */}
      <img
        src="/illustrations/dither-callout.svg"
        alt=""
        width={560}
        height={320}
        className={cn(layer, 'top-0 right-0 h-80 w-140', state === 'waiting' ? 'opacity-45' : FADED_OUT)}
      />
      {/*
        Connected: the dotted ring of `Illustration/state-success`, ten times its size, around the card.
        The box around it swells in brightness, so the picture keeps the strength the design gives it.
      */}
      <div className={cn('absolute inset-0', BREATHES)}>
        <img
          src="/illustrations/state-success.svg"
          alt=""
          width={576}
          height={576}
          className={cn(
            layer,
            'top-[calc(var(--mid)-278px)] -left-17 size-144',
            state === 'connected' ? 'opacity-35' : FADED_OUT
          )}
        />
      </div>
    </div>
  );
}

/**
 * What stands above the card: the empty slot for a host, then the host that took it. Each rises into
 * place a moment after the card has started to move, and sinks away when its turn is over.
 */
function Slot({ shown, children }: { shown: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 transition-[opacity,translate,visibility] duration-500 ease-out motion-reduce:transition-none',
        // A page that opens on this state has no change to animate, so it rises in by itself. Coming
        // from another state, the transition above is what shows: it has the last word over this.
        shown
          ? 'animate-rise-in delay-150 [animation-delay:150ms] motion-reduce:animate-none'
          : 'invisible translate-y-1.5 opacity-0'
      )}
    >
      {children}
    </div>
  );
}

/** The dashed slot above the card that a host will fill, with the tools that can. */
function WaitingSlot() {
  return (
    <>
      <p className="absolute top-[calc(var(--mid)-286px)] left-[88px] flex items-center gap-2 rounded-[20px] border border-dashed border-border-strong bg-subtle px-3 py-2 font-mono text-[11px] leading-3.5 whitespace-nowrap text-secondary">
        <ToolChips />
        waiting for your agent
      </p>
      <span
        aria-hidden="true"
        className="absolute top-[calc(var(--mid)-236px)] left-1/2 h-13 border-l-[1.5px] border-dashed border-muted"
      />
    </>
  );
}

/**
 * The host that took the slot. As it shows, its green border draws itself once round the pill, from the
 * middle of the lower edge and back to it, and the line then runs on from there down to the card.
 * For anyone who prefers reduced motion both are simply there.
 */
function ConnectedSlot({ via, shown }: { via: HostVia; shown: boolean }) {
  return (
    <>
      <p className="absolute top-[calc(var(--mid)-254px)] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-[20px] border border-transparent bg-background px-3 py-2 text-xs leading-4 font-medium whitespace-nowrap text-foreground">
        {/*
          The border as a line that can be drawn: 1px wide, right where the pill's own border is, which
          stays in the layout but is see-through. A rounded rectangle starts at the left end of its
          upper edge, so the start is moved along to the middle of the lower one: `PILL_BORDER_START`.

          The picture starts on the corner of the pill, on a whole pixel, and the line is moved half a
          pixel into it. A picture placed on the half pixel itself gets snapped to a whole one, and its
          straight stretches then fall across two rows of pixels at half their strength.
        */}
        <svg
          aria-hidden="true"
          fill="none"
          className="pointer-events-none absolute -top-px -left-px size-[calc(100%+1px)] overflow-visible"
        >
          <rect
            width="100%"
            height="100%"
            rx="19.5"
            transform="translate(0.5 0.5)"
            pathLength="1"
            strokeWidth="1"
            strokeDashoffset={-PILL_BORDER_START}
            className={cn(
              'stroke-success/60',
              shown && 'animate-draw-around [animation-delay:300ms] motion-reduce:animate-none'
            )}
          />
        </svg>
        <span className="flex size-5.5 items-center justify-center rounded-[5px] border border-border-strong bg-raised">
          <Terminal aria-hidden="true" className="size-3 text-default" strokeWidth={1.5} />
        </span>
        CONNECTED
        <span className="sr-only">from {HOST_LABELS[via]}</span>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
      </p>
      {/* It sets off as the border closes: 300ms of waiting and 900ms of drawing after the pill shows. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-[calc(var(--mid)-214px)] left-1/2 h-13 w-[1.5px] origin-top bg-success/60',
          shown && 'animate-grow-down [animation-delay:1200ms] motion-reduce:animate-none'
        )}
      />
    </>
  );
}

/**
 * The orange border of a card that has a host. It draws itself once round the card, from the middle of
 * the upper edge, where the line from the host arrives, and stays. It lies on top of the card, since the
 * card clips whatever is inside it. Its color is the design's border (`accent` at 45%) and the card's
 * background mixed into one, so the gray border doesn't show through it while that one is still there.
 */
function CardOutline() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      className="pointer-events-none absolute top-0 left-0 size-[calc(100%-1px)] overflow-visible"
    >
      {/* Half a pixel in from the corner, for the same reason as the pill's border. */}
      <rect
        width="100%"
        height="100%"
        rx="13.5"
        transform="translate(0.5 0.5)"
        pathLength="1"
        strokeWidth="1"
        strokeDashoffset={-CARD_BORDER_START}
        className="animate-draw-around stroke-[color:color-mix(in_srgb,var(--color-accent)_45%,var(--color-background))] [animation-delay:1600ms] [animation-duration:1100ms] motion-reduce:animate-none"
      />
    </svg>
  );
}

/**
 * Where the line from the host meets the card's upper edge, as `PILL_BORDER_START` is for the pill:
 * 0.106 of the way round a card 360px wide and 441px tall.
 */
const CARD_BORDER_START = 0.106;

/**
 * How far round the pill's border the middle of its lower edge is, from where a rounded rectangle's
 * outline starts and in the direction it runs: along the top, round the right end and halfway back.
 * For a pill 143px wide and 40px tall that is 0.655 of the way, right over the line; ten pixels more or
 * less of width move the spot by less than a pixel.
 */
const PILL_BORDER_START = 0.655;

/** The logos of the tools an agent can run in, as small chips. */
export function ToolChips({ className }: { className?: string }) {
  // The order of the design: Claude, Cursor, ChatGPT.
  const tools = ['claude', 'cursor', 'chatgpt'].flatMap((id) => AI_TOOLS.find((tool) => tool.id === id) ?? []);

  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center gap-0.75', className)}>
      {tools.map((tool) => (
        <span
          key={tool.id}
          className="flex size-6 items-center justify-center rounded-md border border-border-strong bg-raised p-0.75"
        >
          <img src={tool.icon} alt="" className="size-full rounded-[3px] object-contain" />
        </span>
      ))}
    </span>
  );
}
