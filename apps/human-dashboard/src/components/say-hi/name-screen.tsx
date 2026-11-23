'use client';

import { type FormEvent, useEffect, useId, useState, useTransition } from 'react';

import { checkAddressAction, createInboxAction } from '@/app/(account)/onboarding/actions';
import { AgentCardVertical } from '@/components/agent-card/agent-card-vertical';
import { Button } from '@/components/ui/button';
import { MascotFace } from '@/components/ui/mascot-face';
import { cardSerialOf } from '@/lib/agent-card';
import { newArtSeed } from '@/lib/card-art';
import {
  type AgentLook,
  ART_KINDS,
  BODY_LABELS,
  COLOR_LABELS,
  COLOR_WORDS,
  LOOK_COLORS,
  type LookColor,
  MASCOT_BODIES,
  type MascotBody,
} from '@/lib/look';
import {
  AGENT_NAME_MAX_LENGTH,
  cardLinkOf,
  HANDLE_MAX_LENGTH,
  PLACEHOLDER_HANDLE,
  toHandle,
  writtenLink,
} from '@/lib/onboarding';
import { cn } from '@/lib/utils';

import { type BubblePlace, DepthFloor, MascotSlot, SpotlightSlot } from './mascot-stage';
import { KeyHints, ScreenSpace, ScreenTitle, useShortcut } from './parts';

/** The names offered under the field, as the design has them. */
const SUGGESTED_NAMES = ['Sid', 'Atlas', 'Juno', 'Pip', 'Otto'];

/** What Shuffle picks from: short names that read as someone's, and make a free-looking address. */
const MORE_NAMES = [
  'Nova',
  'Milo',
  'Iris',
  'Remy',
  'Wren',
  'Kit',
  'Echo',
  'Luna',
  'Beau',
  'Rio',
  'Ada',
  'Ziggy',
  'Mabel',
  'Odie',
  'Pax',
  'Tilly',
  'Bo',
  'Fern',
  'Hugo',
  'Lark',
];

/**
 * A.1's bubble hangs off the card, not the mascot: its tail 202px to the right of the mascot's left edge and 155px
 * above its top, the mascot being 124px.
 */
const CARD_BUBBLE: BubblePlace = { left: 202.34 / 124, bottom: (124 + 154.74) / 124 };

/** How long the operator has to stop typing before the address is checked. */
const CHECK_AFTER_MS = 250;

type Availability = { handle: string; available: boolean; suggestion?: string } | null;

type NameScreenProps = {
  mailDomain: string;
  origin: string;
  operatorEmail: string | null;
  look: AgentLook;
  onLookChange: (look: AgentLook) => void;
};

/**
 * A.1 · Name it, make it yours. The operator names the agent, and the name becomes its address, on the card as
 * they type: an address they edit stays until they change the name again, and one that is taken gives way to a
 * free one close to it. Around the card they pick the mascot's body and colour and redraw the card's art. "Looks
 * good" makes the agent with all of it; from then on the name, the address and the look are its own.
 */
export function NameScreen({ mailDomain, origin, operatorEmail, look, onLookChange }: NameScreenProps) {
  const nameId = useId();
  const [name, setName] = useState('');
  const [ownHandle, setOwnHandle] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [availability, setAvailability] = useState<Availability>(null);
  // The address that couldn't be checked, the API being out of reach.
  const [uncheckable, setUncheckable] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [creating, startCreating] = useTransition();

  const trimmed = name.trim();
  const asked = toHandle(ownHandle ?? name);
  const answer = availability?.handle === asked ? availability : null;
  const taken = answer?.available === false;
  const handle = taken && answer.suggestion ? answer.suggestion : asked;
  const address = `${handle || PLACEHOLDER_HANDLE}@${mailDomain}`;
  const unchecked = !answer && uncheckable === asked;
  // "Looks good" waits for a name that makes an address, and for that address to be known free: the one asked for,
  // or the free one offered in its place. One that couldn't be checked goes ahead: making the agent checks it again
  // and has the last word.
  const ready = Boolean(trimmed && handle) && (answer ? answer.available || Boolean(answer.suggestion) : unchecked);

  useEffect(() => {
    if (!asked) {
      return;
    }

    let stale = false;
    const timer = setTimeout(async () => {
      let check: Availability = null;
      try {
        check = await checkAddressAction(asked);
      } catch {
        // Out of reach: `ready` lets the agent be made anyway.
      }
      if (stale) {
        return;
      }

      if (check) {
        setAvailability(check);
      } else {
        setUncheckable(asked);
      }
    }, CHECK_AFTER_MS);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [asked]);

  const redraw = () => {
    const kind = ART_KINDS[Math.floor(Math.random() * ART_KINDS.length)];
    onLookChange({ ...look, art: { kind, seed: newArtSeed() } });
  };

  const shuffle = () => {
    const pool = [...SUGGESTED_NAMES, ...MORE_NAMES].filter((candidate) => candidate !== trimmed);
    setName(pool[Math.floor(Math.random() * pool.length)]);
    setOwnHandle(null);
  };

  function create(event?: FormEvent) {
    event?.preventDefault();
    if (!ready || creating) {
      return;
    }

    setError(undefined);
    const askedNow = asked;
    startCreating(async () => {
      const result = await createInboxAction({ name: trimmed, handle, look });
      if (result.ok) {
        return;
      }

      if (result.check) {
        // The answer is about the address sent, which may be the free one offered in place of the one asked for,
        // taken since. It is kept as the answer for the one asked for, so the page offers the next free one
        // instead of waiting for a check that never comes.
        setAvailability({ ...result.check, handle: askedNow });
      } else {
        setError(result.message);
      }
    });
  }

  useShortcut('r', redraw);

  const bubble = trimmed ? `${trimmed} suits me. So does ${COLOR_WORDS[look.color]}.` : 'What should I be called?';

  return (
    <>
      <ScreenSpace above={36} below={14}>
        {/* The card in the middle and the rails at its sides, as the design has them; on a narrow screen, rows under it. */}
        <div className="relative flex flex-col items-center gap-4 lg:block">
          <SpotlightSlot opacity={0.2} className="-top-19 left-[calc(50%-500px)]" />
          <DepthFloor className="top-[542.5px] left-[calc(50%-211.5px)] hidden lg:block" />
          <AgentCardVertical
            look={look}
            name={trimmed || 'Your agent'}
            status="Not connected yet"
            address={address}
            link={writtenLink(cardLinkOf(origin, handle || PLACEHOLDER_HANDLE))}
            serial={cardSerialOf(handle || PLACEHOLDER_HANDLE)}
            placeholder={{ name: !trimmed, address: !handle }}
            mascot={<MascotSlot bubble={bubble} bubbleAt={CARD_BUBBLE} bubbleSize="large" className="w-full" />}
          />
          <BodyPicker
            look={look}
            onPick={(shape) => onLookChange({ ...look, shape })}
            className="lg:absolute lg:top-1/2 lg:right-[calc(100%+44px)] lg:-translate-y-[calc(50%+20px)]"
          />
          <ColorPicker
            look={look}
            onPick={(color) => onLookChange({ ...look, color })}
            className="lg:absolute lg:top-1/2 lg:left-[calc(100%+48px)] lg:-translate-y-[calc(50%+20px)]"
          />
        </div>
        <button
          type="button"
          onClick={redraw}
          className="cursor-pointer relative mt-5.5 rounded-sm text-xs leading-4 whitespace-pre text-foreground/60 transition-colors hover:text-foreground"
        >
          {'↻  Redraw art'}
        </button>

        <form onSubmit={create} className="mt-8 flex w-80 max-w-full flex-col items-center">
          <ScreenTitle className="text-2xl leading-7.5">
            {/* No line height of its own: Redaction's taller lines would make the heading taller than the design's 30px. */}
            Give your agent an <em className="font-sapien-display leading-0 font-normal text-accent">inbox</em>
          </ScreenTitle>

          <label htmlFor={nameId} className="sr-only">
            Name
          </label>
          <div className="mt-4 flex h-10 w-full items-center rounded-[10px] border border-border-strong bg-[#161616] px-3.5 transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgb(255_92_48/0.18)]">
            <input
              id={nameId}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                // A new name brings back the address that follows it, so the card shows what this name would get.
                setOwnHandle(null);
                setError(undefined);
              }}
              maxLength={AGENT_NAME_MAX_LENGTH}
              placeholder="Name your agent"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              // biome-ignore lint/a11y/noAutofocus: the screen starts where the typing does
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-base leading-5.25 text-foreground caret-accent outline-none placeholder:text-muted"
            />
            {editing ? (
              <input
                value={ownHandle ?? asked}
                onChange={(event) => setOwnHandle(toTypedHandle(event.target.value))}
                onBlur={() => setEditing(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    setEditing(false);
                  }
                }}
                maxLength={HANDLE_MAX_LENGTH}
                aria-label="Address"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                spellCheck={false}
                // biome-ignore lint/a11y/noAutofocus: it appears because Edit was pressed
                autoFocus
                className="w-28 min-w-0 bg-transparent text-right font-mono text-sm leading-4.5 text-foreground caret-accent outline-none"
              />
            ) : (
              <span className="shrink-0 font-mono text-sm leading-4.5 text-foreground/35">
                {handle && handle !== toHandle(trimmed) ? `${handle}@${mailDomain}` : `@${mailDomain}`}
              </span>
            )}
          </div>
          <AddressNote
            asked={asked}
            answer={answer}
            unchecked={unchecked}
            named={Boolean(trimmed)}
            editing={editing}
            error={error}
            onEdit={() => {
              setOwnHandle(handle);
              setEditing(!editing);
            }}
          />

          <div className="mt-2.5 flex w-full items-center justify-between">
            <div className="flex items-start gap-1">
              {SUGGESTED_NAMES.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  aria-pressed={trimmed === suggestion}
                  onClick={() => {
                    setName(suggestion);
                    setOwnHandle(null);
                  }}
                  // Every chip has its border, see-through until picked, inside the design's 5px by 9px padding: a
                  // border that only the picked chip had made it 2px bigger and pushed the chips after it along.
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs leading-4 font-medium transition-colors duration-200',
                    trimmed === suggestion
                      ? 'border-accent/40 bg-accent/14 text-foreground'
                      : 'border-transparent bg-foreground/5 text-foreground/55 hover:text-foreground'
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={shuffle}
              className="flex items-center gap-1.25 rounded-md px-1.75 py-1.5 text-xs leading-4 font-medium text-foreground/50 transition-colors hover:text-foreground"
            >
              <ShuffleIcon />
              Shuffle
            </button>
          </div>

          <Button
            type="submit"
            pending={creating}
            disabled={!ready}
            className="mt-5 transition-[background-color,opacity]"
          >
            Looks good
          </Button>
          <div className="mt-4">
            <KeyHints
              hints={[
                { keys: ['R'], label: 'redraw art' },
                { keys: ['enter'], label: 'looks good' },
              ]}
            />
          </div>
        </form>
        {operatorEmail && <span className="sr-only">Signed in as {operatorEmail}</span>}
      </ScreenSpace>
      <p
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-12 hidden font-mono text-[10px] leading-3 whitespace-pre text-muted lg:block"
      >
        {'fig. 03  one of a kind'}
      </p>
    </>
  );
}

/**
 * Focus from the keyboard brightens the swatch's own border, with the name field's glow around it. A ring of its own
 * outside the picked swatch's border showed as a double border, the focused swatch being the picked one.
 */
const FOCUS_RING = 'has-focus-visible:border-accent has-focus-visible:shadow-[0_0_0_3px_rgb(255_92_48/0.18)]';

/** The rails' labels, SHAPE and COLOR. */
const RAIL_LABEL = 'font-mono text-[10px] leading-3.5 font-medium tracking-[0.8px] text-muted uppercase';

/** The rails' box: the design's `Shape picker` and `Color picker`. */
const RAIL = 'flex flex-col items-center rounded-2xl border border-border-strong bg-raised p-3.5';

type PickerProps<T> = { look: AgentLook; onPick: (value: T) => void; className?: string };

/**
 * The six bodies, each drawn in the colour being picked, and blending into a new one when it changes. Peek is cut
 * off by its square, with the square's corners rounded as the design's tile has them.
 */
function BodyPicker({ look, onPick, className }: PickerProps<MascotBody>) {
  const group = useId();

  return (
    <div role="radiogroup" aria-label="Shape" className={cn(RAIL, 'gap-1.5', className)}>
      <p aria-hidden="true" className={RAIL_LABEL}>
        Shape
      </p>
      <div className="flex gap-1 lg:flex-col lg:gap-1.5">
        {MASCOT_BODIES.map((body) => {
          const picked = look.shape === body;

          return (
            <label
              key={body}
              className={cn(
                'flex size-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] p-0.75 transition-[background-color,border-color,box-shadow] duration-200 lg:size-13 lg:p-[2.5px]',
                FOCUS_RING,
                picked ? 'border-accent bg-[#1c1c1c]' : 'border-transparent hover:bg-[#1c1c1c]/60'
              )}
            >
              <input
                type="radio"
                name={group}
                value={body}
                checked={picked}
                onChange={() => onPick(body)}
                aria-label={BODY_LABELS[body]}
                className="sr-only"
              />
              <MascotFace
                art="swatch"
                still
                look={{ shape: body, color: look.color }}
                className={cn(
                  'size-9 overflow-hidden rounded-lg transition-opacity duration-200 lg:size-11 lg:rounded-[10px]',
                  picked ? 'opacity-100' : 'opacity-75'
                )}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The six colours, each the body being picked in that colour, named beside it on a wide screen. A new body bends
 * into all six, as it does on the card.
 */
function ColorPicker({ look, onPick, className }: PickerProps<LookColor>) {
  const group = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Color"
      className={cn(RAIL, 'gap-1.5 lg:w-40.5 lg:items-start lg:gap-0.5', className)}
    >
      <p aria-hidden="true" className={RAIL_LABEL}>
        Color
      </p>
      <div className="flex gap-1 lg:flex-col lg:gap-0.5">
        {LOOK_COLORS.map((color) => {
          const picked = look.color === color;

          return (
            <label
              key={color}
              className={cn(
                'flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] text-[13px] leading-4.25 transition-[background-color,border-color,color,padding,box-shadow] duration-200 lg:w-33 lg:justify-start lg:gap-2',
                FOCUS_RING,
                picked
                  ? 'border-accent bg-[#1c1c1c] text-foreground lg:pl-1.5'
                  : 'border-transparent text-foreground/60 hover:text-foreground lg:pl-[2.5px]'
              )}
            >
              <input
                type="radio"
                name={group}
                value={color}
                checked={picked}
                onChange={() => onPick(color)}
                aria-label={COLOR_LABELS[color]}
                className="sr-only"
              />
              <MascotFace
                art="swatch"
                still
                look={{ shape: look.shape, color }}
                className="size-8.5 shrink-0 overflow-hidden rounded-lg opacity-75"
              />
              <span aria-hidden="true" className="hidden lg:inline">
                {COLOR_LABELS[color]}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * What is known of the address, under the field: being checked, free, or taken with the free one offered, and
 * Edit. A failure to make the agent shows here too, so nothing below the field moves.
 */
function AddressNote({
  asked,
  answer,
  unchecked,
  named,
  editing,
  error,
  onEdit,
}: {
  asked: string;
  answer: Availability;
  /** The address couldn't be checked just now. */
  unchecked: boolean;
  named: boolean;
  editing: boolean;
  error?: string;
  onEdit: () => void;
}) {
  let note = 'Your agent’s address follows its name.';
  let tone = 'text-muted';
  if (error) {
    note = error;
    tone = 'text-danger';
  } else if (unchecked) {
    note = 'Couldn’t check the address. It’s checked again as your agent is made.';
  } else if (named && asked && !answer) {
    note = 'Checking the address…';
  } else if (answer?.available) {
    note = `${answer.handle} is free.`;
    tone = 'text-success';
  } else if (answer && !answer.available) {
    note = answer.suggestion
      ? `${answer.handle} is taken, so it’s ${answer.suggestion}.`
      : `${answer.handle} is taken. Try another name.`;
    tone = 'text-pending';
  }

  return (
    <p className="mt-2 flex h-4 w-full items-center justify-between gap-3 text-xs leading-4">
      <span
        key={note}
        role={error ? 'alert' : undefined}
        className={cn('animate-overlay-in truncate motion-reduce:animate-none', tone)}
      >
        {note}
      </span>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onEdit}
        disabled={!named && !editing}
        className="shrink-0 rounded-sm text-foreground/60 transition-colors hover:text-foreground disabled:opacity-50 disabled:hover:text-foreground/60"
      >
        {editing ? 'Done' : 'Edit address'}
      </button>
    </p>
  );
}

/** The design's `Human/Icon/shuffle`, 13px. */
function ShuffleIcon() {
  return (
    <svg viewBox="0 0 13 13" className="size-3.25 shrink-0 text-foreground" fill="currentColor" aria-hidden="true">
      <path d="M9.425 9.36796V8.45L11.8625 9.9125L9.425 11.375V10.3561C8.67983 10.2494 7.97464 9.95277 7.37726 9.49473C6.77988 9.03668 6.3104 8.43264 6.01396 7.74069L6.0125 7.73825L6.01104 7.74118C5.67275 8.53031 5.11037 9.20286 4.39356 9.67547C3.67675 10.1481 2.83703 10.4 1.97844 10.4H1.625V9.425H1.97844C2.6463 9.42498 3.29948 9.22899 3.85703 8.86131C4.41457 8.49362 4.85197 7.97042 5.11501 7.35654L5.4821 6.5L5.11501 5.64346C4.85197 5.02958 4.41457 4.50638 3.85703 4.1387C3.29948 3.77101 2.6463 3.57502 1.97844 3.575H1.625V2.6H1.97844C2.83708 2.60004 3.67684 2.85203 4.39366 3.32473C5.11047 3.79744 5.67283 4.47008 6.01104 5.25931L6.0125 5.26175L6.01396 5.25883C6.31046 4.56697 6.77998 3.96302 7.37735 3.50506C7.97473 3.04711 8.67988 2.75054 9.425 2.64388V1.625L11.8625 3.0875L9.425 4.55V3.63204C8.87261 3.73439 8.35403 3.97153 7.9153 4.32241C7.47656 4.6733 7.13124 5.12708 6.90999 5.64346L6.5429 6.5L6.90999 7.35654C7.13124 7.87293 7.47656 8.3267 7.9153 8.67759C8.35403 9.02847 8.87261 9.26562 9.425 9.36796V9.36796Z" />
    </svg>
  );
}

/** What can be typed for an address: lowercase letters, digits and single hyphens. */
function toTypedHandle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, HANDLE_MAX_LENGTH);
}
