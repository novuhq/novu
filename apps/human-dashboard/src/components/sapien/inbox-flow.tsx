'use client';

import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';

import { CHANNEL_NAMES } from '@/components/sapien/brand-logo';
import { INBOX_LABELS, type InboxAgent, type InboxThread } from '@/data/sapien-inbox';
import { hostOf } from '@/lib/hosts';
import { cn } from '@/lib/utils';

import { AgentLogo, ChannelLogo } from './brand-logo';
import { PersonFace } from './person-face';

const ROW = 60;
/** Half the peek window: a short rounded rectangle, a little taller than one line of the read. */
const HOLE = { w: 86, h: 24 };
/** How far the window closes on its target per frame. The tour uses the same pace, and waits between rows. */
const FOLLOW = { hole: 0.2, size: 0.13 };
/** How long the tour rests on a row before it moves to the next. */
const TOUR_REST_MS = 4800;
const mono = 'font-sapien-mono text-[11px] leading-none tracking-tight';
const agentInk = 'text-accent';

type Motion = { x: number; y: number; w: number; h: number };
type Driver = 'tour' | 'pointer' | 'keys' | 'still';

const prefersStill = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The same inbox twice, stacked. People see the top layer: names, apps, messages. The agent's layer sits under
 * it, row for row, and shows through a small rectangle. The rectangle rests on a row, then moves to the next
 * at the same pace a pointer would. A pointer or the keyboard takes it over, and the tour resumes when they leave.
 */
export function InboxFlow({ agent }: { agent: InboxAgent }) {
  const host = hostOf(agent.host);
  const stage = useRef<HTMLDivElement>(null);
  const mountStage = useCallback((node: HTMLDivElement | null) => {
    stage.current = node;
    if (!node || node.style.getPropertyValue('--h')) return;
    node.style.setProperty('--x', '0px');
    node.style.setProperty('--y', '0px');
    node.style.setProperty('--w', '0px');
    node.style.setProperty('--h', '0px');
    node.style.setProperty('--o', '0');
  }, []);
  const target = useRef<Motion>({ x: 0, y: 0, w: 0, h: 0 });
  const now = useRef<Motion>({ x: 0, y: 0, w: 0, h: 0 });
  const frame = useRef(0);
  const driver = useRef<Driver>('still');
  const rowRef = useRef<number | null>(null);
  const onSettled = useRef<() => void>(() => {});
  const [row, setRow] = useState<number | null>(null);

  const showRow = (index: number | null) => {
    rowRef.current = index;
    setRow(index);
  };

  const paint = useCallback(() => {
    const node = stage.current;
    if (!node) return;
    const still = prefersStill();
    const goal = target.current;
    const at = now.current;
    const step = (from: number, to: number, amount: number) => (still ? to : from + (to - from) * amount);

    at.x = step(at.x, goal.x, FOLLOW.hole);
    at.y = step(at.y, goal.y, FOLLOW.hole);
    at.w = step(at.w, goal.w, FOLLOW.size);
    at.h = step(at.h, goal.h, FOLLOW.size);

    node.style.setProperty('--x', `${at.x}px`);
    node.style.setProperty('--y', `${at.y}px`);
    node.style.setProperty('--w', `${Math.max(at.w, 0)}px`);
    node.style.setProperty('--h', `${Math.max(at.h, 0)}px`);
    node.style.setProperty('--o', String(Math.min(1, at.h / 10)));
    node.dataset.open = at.h > 2 ? 'true' : 'false';

    const settled =
      Math.abs(goal.x - at.x) < 0.2 &&
      Math.abs(goal.y - at.y) < 0.2 &&
      Math.abs(goal.w - at.w) < 0.2 &&
      Math.abs(goal.h - at.h) < 0.2;
    if (settled) {
      frame.current = 0;
      onSettled.current();

      return;
    }
    frame.current = requestAnimationFrame(paint);
  }, []);

  const kick = useCallback(() => {
    if (frame.current === 0) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  const openOn = (index: number, x: number) => {
    const node = stage.current;
    if (!node) return;
    const goal = target.current;
    const y = index * ROW + ROW / 2;
    if (goal.h === 0) {
      // A fresh window opens on the row, rather than sliding in from the last spot.
      Object.assign(now.current, { x, y });
    }
    goal.x = x;
    goal.y = y;
    goal.w = HOLE.w;
    goal.h = HOLE.h;
    showRow(index);
    kick();
  };

  const close = () => {
    target.current.w = 0;
    target.current.h = 0;
    showRow(null);
    kick();
  };

  const actions = useRef({ openOn, close });
  actions.current = { openOn, close };
  const holdTour = useRef<() => void>(() => {});
  const releaseTour = useRef<() => void>(() => {});

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    let rest = 0;
    let visible = false;
    const count = agent.threads.length;

    const clearRest = () => window.clearTimeout(rest);

    const tour = () => {
      if (!visible || prefersStill() || driver.current === 'pointer' || driver.current === 'keys') return;
      driver.current = 'tour';
      const index = rowRef.current ?? 0;
      const width = node.clientWidth;
      if (target.current.h === 0) {
        actions.current.openOn(index, width / 2);

        return;
      }
      kick();
    };

    const restThenAdvance = () => {
      clearRest();
      if (driver.current !== 'tour' || !visible || prefersStill()) return;
      rest = window.setTimeout(() => {
        if (driver.current !== 'tour' || !visible || prefersStill()) return;
        const next = ((rowRef.current ?? -1) + 1) % count;
        actions.current.openOn(next, node.clientWidth / 2);
      }, TOUR_REST_MS);
    };

    onSettled.current = restThenAdvance;
    holdTour.current = clearRest;
    releaseTour.current = () => {
      driver.current = 'tour';
      restThenAdvance();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
        if (visible) {
          tour();

          return;
        }
        clearRest();
        if (frame.current !== 0) cancelAnimationFrame(frame.current);
        frame.current = 0;
      },
      { threshold: [0, 0.4] }
    );
    observer.observe(node);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => {
      if (prefersStill()) {
        clearRest();
        if (driver.current === 'tour') {
          driver.current = 'still';
          actions.current.close();
        }

        return;
      }
      tour();
    };
    motion.addEventListener('change', onMotion);

    return () => {
      clearRest();
      onSettled.current = () => {};
      observer.disconnect();
      motion.removeEventListener('change', onMotion);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      holdTour.current = () => {};
      releaseTour.current = () => {};
    };
  }, [agent.threads.length, kick]);

  const aim = (event: PointerEvent<HTMLDivElement>) => {
    driver.current = 'pointer';
    holdTour.current();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const index = Math.min(agent.threads.length - 1, Math.max(0, Math.floor(y / ROW)));
    const width = event.currentTarget.clientWidth;
    const pad = HOLE.w + 12;
    openOn(index, width <= pad * 2 ? width / 2 : Math.min(Math.max(x, pad), width - pad));
  };

  const reveal = (index: number) => {
    driver.current = 'keys';
    holdTour.current();
    const width = stage.current?.clientWidth ?? 0;
    openOn(index, width / 2);
  };

  const resume = () => {
    if (prefersStill()) {
      driver.current = 'still';
      holdTour.current();
      close();

      return;
    }
    releaseTour.current();
  };

  const leave = () => {
    if (driver.current === 'keys') return;
    resume();
  };

  const focused = row === null ? null : agent.threads[row];

  return (
    <div className="w-full overflow-hidden rounded-[20px] border border-sapien-border bg-linear-to-b from-[#12100e] to-[#080706] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_70px_-36px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-3 border-b border-sapien-border px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-2 rounded-full bg-sapien-surface" />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <AgentLogo agent={agent.host} size="small" />
          <span className={cn(mono, 'min-w-0 truncate text-sapien-foreground/55')}>
            {host.name} <span className="text-sapien-foreground/25">·</span> {agent.email}
          </span>
        </span>
        <span className="flex items-center gap-1.5 font-sapien-mono text-[9px] leading-none tracking-[0.08em] text-sapien-foreground/40 uppercase">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-[#4ad38a] shadow-[0_0_8px_rgba(74,211,138,0.6)]"
          />
          {INBOX_LABELS.live}
        </span>
      </div>

      <div
        ref={mountStage}
        data-open={row === null ? 'false' : 'true'}
        onPointerEnter={aim}
        onPointerMove={aim}
        onPointerLeave={leave}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          if (driver.current === 'pointer') return;
          resume();
        }}
        className="group/stage relative cursor-crosshair touch-pan-y overflow-hidden select-none"
      >
        <ul aria-label={INBOX_LABELS.inbox} data-face="seen">
          {agent.threads.map((thread, index) => (
            <HumanRow key={thread.id} thread={thread} onFocus={() => reveal(index)} />
          ))}
        </ul>

        <section
          data-face="reading"
          aria-label={INBOX_LABELS.agent}
          className="pointer-events-none absolute inset-0 bg-[#141210] [clip-path:inset(calc(var(--y)-var(--h))_calc(100%-var(--x)-var(--w))_calc(100%-var(--y)-var(--h))_calc(var(--x)-var(--w))_round_6px)]"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(238,229,216,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(238,229,216,0.07)_1px,transparent_1px)] [background-size:12px_12px]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,92,48,0.07)_0px,rgba(255,92,48,0.07)_1px,transparent_1px,transparent_3px)] motion-safe:animate-[sapien-scan_6s_linear_infinite]"
          />
          <ul className="relative">
            {agent.threads.map((thread, index) => (
              <AgentRow key={thread.id} thread={thread} index={index} />
            ))}
          </ul>
        </section>

        <Rim />
      </div>

      <div className="flex items-center border-t border-sapien-border px-4 py-2.5">
        <span className={cn(mono, 'grid min-w-0 text-[10px] text-sapien-foreground/40')}>
          <span
            className={cn(
              'col-start-1 row-start-1 truncate transition-opacity duration-300 motion-reduce:transition-none',
              focused && 'opacity-0'
            )}
          >
            {INBOX_LABELS.peek}
          </span>
          <span
            className={cn(
              'col-start-1 row-start-1 truncate transition-opacity duration-300 motion-reduce:transition-none',
              agentInk,
              !focused && 'opacity-0'
            )}
          >
            {focused ? `One shape · ${CHANNEL_NAMES[focused.via]}` : INBOX_LABELS.agent}
          </span>
        </span>
      </div>
    </div>
  );
}

function HumanRow({ thread, onFocus }: { thread: InboxThread; onFocus: () => void }) {
  return (
    <li className="border-b border-sapien-border last:border-b-0">
      <button
        type="button"
        onFocus={onFocus}
        className="flex h-15 w-full cursor-crosshair items-center gap-3 bg-transparent px-4 text-left font-inherit focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        <span className="relative shrink-0">
          <PersonFace seed={thread.sender} className="size-8" />
          <span className="absolute -right-1 -bottom-1 flex rounded-full bg-[#0b0a09] p-px">
            <ChannelLogo channel={thread.via} size={14} />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[13px] leading-none tracking-tight text-sapien-foreground">
              {thread.sender}
            </span>
            <span className={cn(mono, 'shrink-0 text-[10px] text-sapien-foreground/30')}>
              {CHANNEL_NAMES[thread.via]} · {thread.time}
            </span>
          </span>
          <span
            className={cn(
              'truncate text-[13px] leading-none tracking-tight',
              thread.unread ? 'text-sapien-foreground/80' : 'text-sapien-foreground/45'
            )}
          >
            {thread.preview}
          </span>
        </span>
        {thread.unread ? (
          <>
            <span className="sr-only">{INBOX_LABELS.unreadThread}</span>
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          </>
        ) : null}
      </button>
    </li>
  );
}

/** The row under a person's row: the same message, as keys. Lines slide in one after another as the hole opens. */
function AgentRow({ thread, index }: { thread: InboxThread; index: number }) {
  const fields = [{ key: 'via', value: thread.via }, ...thread.reads];

  return (
    <li
      className="flex h-15 items-center gap-3 border-b border-sapien-foreground/10 px-4 opacity-0 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] -translate-x-1.5 last:border-b-0 group-data-[open=true]/stage:translate-x-0 group-data-[open=true]/stage:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-none"
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <span className={cn(mono, 'w-8 shrink-0 text-center text-[10px] text-sapien-foreground/35')}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={cn(mono, 'truncate text-[10px] text-sapien-foreground/45')}>{thread.id}</span>
        <span className={cn(mono, 'truncate text-sapien-foreground/40')}>
          {'{ '}
          {fields.map((field, position) => (
            <span key={field.key}>
              <span className="text-accent">{field.key}</span>
              {': '}
              <span className={position === 0 ? 'text-sapien-foreground' : 'text-sapien-foreground/70'}>
                "{field.value}"
              </span>
              {position < fields.length - 1 ? ', ' : ''}
            </span>
          ))}
          {' }'}
        </span>
      </span>
    </li>
  );
}

/** The window's edge: a rounded rectangle with a corner at each end, like a small viewfinder. */
function Rim() {
  const corner = 'absolute size-1.5 border-accent';

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-(--y) left-(--x) h-[calc(var(--h)*2)] w-[calc(var(--w)*2)] -translate-1/2 rounded-md opacity-(--o) shadow-[0_0_0_1px_rgba(238,229,216,0.28),0_0_0_1px_rgba(255,92,48,0.7),0_0_16px_2px_rgba(255,92,48,0.28)]"
    >
      <span className={cn(corner, 'top-px left-px border-t border-l')} />
      <span className={cn(corner, 'top-px right-px border-t border-r')} />
      <span className={cn(corner, 'bottom-px left-px border-b border-l')} />
      <span className={cn(corner, 'right-px bottom-px border-r border-b')} />
    </span>
  );
}
