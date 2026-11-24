'use client';

import { usePathname } from 'next/navigation';
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useId, useRef, useState } from 'react';

import type { NavigationChannel } from '@/data/site-navigation';
import { cn } from '@/lib/utils';

import {
  NAVIGATION_LINK_CLASS,
  NavigationChevron,
  opensHere,
  SiteAgentLink,
  SiteChannelLink,
} from './site-navigation-items';

/** How long the pointer may be off the menu before it closes: long enough to cut the corner from the label to the panel. */
const CLOSE_DELAY = 300;
/** How long a channel waits while the pointer crosses it on its way to the agents. */
const AIM_DELAY = 300;
/** How far back the pointer's direction is read from: past a stalled frame or two, and short of `AIM_DELAY`. */
const AIM_WINDOW = 250;
/** How far above or below the agents the pointer may be heading and still count as heading there. */
const AIM_SLACK = 24;

type ChannelId = NavigationChannel['id'];
type Point = { x: number; y: number; time: number };

/** Whether a pointer that went from `from` to `to` is on its way to `target`, which lies to the right. */
function isHeadingTo(from: Point, to: Point, target: DOMRect): boolean {
  if (to.x <= from.x || from.x >= target.left) return false;
  const yAtTarget = from.y + ((to.y - from.y) * (target.left - from.x)) / (to.x - from.x);

  return yAtTarget >= target.top - AIM_SLACK && yAtTarget <= target.bottom + AIM_SLACK;
}

/**
 * The header's channels menu (Figma `1661:10545`): the channels on the left, and on the right the agents to
 * connect on the channel that is pointed at or focused.
 *
 * The pointer opens it and leaving closes it; a click or the keyboard opens it to stay, until a second click,
 * Escape, a click elsewhere or the focus leaving. Every link is in the page from the start, so the panel only
 * decides what shows. Each channel's agents follow it in the tab order, and focusing any of them shows theirs.
 */
export function SiteChannelsMenu({
  label,
  agentsLabel,
  channels,
}: {
  label: string;
  agentsLabel: string;
  channels: readonly NavigationChannel[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /** Opened by a click or holding the keyboard's focus: it stays when the pointer leaves. */
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState(channels[0].id);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  /** Each channel's list of agents, by the channel's id. */
  const agentLists = useRef<Partial<Record<ChannelId, HTMLUListElement | null>>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const aimTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** The pointer's last moves over the panel, oldest first, no older than `AIM_WINDOW`. */
  const trail = useRef<Point[]>([]);
  /** The channel a finger or a pen went down on while another channel's agents were on show. */
  const touched = useRef<ChannelId | null>(null);
  const panelId = useId();

  const show = () => {
    clearTimeout(closeTimer.current);
    if (open) return;
    setActive(channels[0].id);
    setOpen(true);
  };

  const hide = useCallback(() => {
    clearTimeout(closeTimer.current);
    clearTimeout(aimTimer.current);
    trail.current = [];
    touched.current = null;
    setOpen(false);
    setPinned(false);
  }, []);

  const activate = (channel: ChannelId) => {
    clearTimeout(aimTimer.current);
    setActive(channel);
  };

  const follow = (event: ReactPointerEvent) => {
    const now = event.timeStamp;
    trail.current = [
      ...trail.current.filter((point) => now - point.time <= AIM_WINDOW),
      { x: event.clientX, y: event.clientY, time: now },
    ];
  };

  /** Whether the pointer's recent moves lead to the agents on show: it is crossing the channels, not choosing one. */
  const isAimingAtAgents = (now: number) => {
    const recent = trail.current.filter((point) => now - point.time <= AIM_WINDOW);
    const target = agentLists.current[active]?.getBoundingClientRect();

    return recent.length > 1 && !!target && isHeadingTo(recent[0], recent[recent.length - 1], target);
  };

  /** Whether the keyboard's focus is on an agent. Its list stays on show then, wherever the pointer goes. */
  const isKeyboardOnAgent = () => {
    const focused = document.activeElement;

    return (
      !!focused?.matches(':focus-visible') && Object.values(agentLists.current).some((list) => list?.contains(focused))
    );
  };

  /** The pointer's choice of a channel. An agent it had clicked elsewhere lets go of the focus, now out of sight. */
  const choose = (channel: ChannelId) => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && Object.values(agentLists.current).some((list) => list?.contains(focused)))
      focused.blur();
    setActive(channel);
  };

  /** A channel the pointer came to shows its agents at once, unless the pointer is only passing over it. */
  const point = (channel: ChannelId, event: ReactPointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    follow(event);
    clearTimeout(aimTimer.current);
    if (channel === active || isKeyboardOnAgent()) return;
    if (!isAimingAtAgents(event.timeStamp)) {
      choose(channel);

      return;
    }
    const settle = () => {
      // Still moving towards the agents: keep waiting. Stopped or turned away: this is the channel it wants.
      if (isAimingAtAgents(performance.now())) aimTimer.current = setTimeout(settle, AIM_DELAY);
      else choose(channel);
    };
    aimTimer.current = setTimeout(settle, AIM_DELAY);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const hadFocus = root.current?.contains(document.activeElement);
      hide();
      if (hadFocus) trigger.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) hide();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, hide]);

  useEffect(
    () => () => {
      clearTimeout(closeTimer.current);
      clearTimeout(aimTimer.current);
    },
    []
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: it only watches the pointer and the focus; the button and the links in it are the controls
    <div
      ref={root}
      className="relative flex h-12.5 items-center"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') show();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse' || pinned) return;
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(hide, CLOSE_DELAY);
      }}
      onFocus={(event) => {
        // The keyboard's focus in the panel holds the menu open: closing it would drop the focus with it. That
        // goes for a close already on its way, from a pointer that left just before.
        const focused: Element = event.target;
        if (focused !== trigger.current && focused.matches(':focus-visible')) {
          clearTimeout(closeTimer.current);
          setPinned(true);
        }
      }}
      onBlur={(event) => {
        // Focus that went to another control closes the menu; a click on the panel's own surface doesn't.
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) hide();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open && pinned) {
            hide();

            return;
          }
          show();
          setPinned(true);
        }}
        className={cn(NAVIGATION_LINK_CLASS, 'group/trigger cursor-pointer aria-expanded:text-sapien-foreground')}
      >
        {label}
        <NavigationChevron />
      </button>
      {/*
       * 24px left of the label, under the header's line: Figma places it at 658 of 1920, the label at 682.
       * Closed, it is out of sight but keeps its place, so its drawings load with the page wherever the row shows.
       * It is in sight from the moment it opens, for the keyboard to enter, and fades out before it goes.
       */}
      <div
        id={panelId}
        onPointerMove={(event) => {
          if (event.pointerType === 'mouse') follow(event);
        }}
        className={cn(
          'absolute top-full -left-6 min-h-52 w-128 overflow-clip rounded-b-lg bg-black duration-150 after:pointer-events-none after:absolute after:inset-0 after:rounded-b-lg after:border after:border-sapien-border motion-reduce:transition-none',
          open
            ? 'transition-[opacity,translate]'
            : 'invisible -translate-y-1 opacity-0 transition-[opacity,translate,visibility]'
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-61 border-r border-sapien-border bg-sapien-border/40"
        />
        <p
          aria-hidden="true"
          className="absolute top-6.25 left-67 font-sapien-mono text-[10px] leading-none tracking-tight text-sapien-foreground/70 uppercase"
        >
          {agentsLabel}
        </p>
        <ul className="relative flex w-61 flex-col gap-0.5 p-3">
          {channels.map((channel) => {
            const isActive = channel.id === active;

            return (
              <li key={channel.id}>
                <SiteChannelLink
                  channel={channel}
                  active={isActive}
                  aria-current={pathname === channel.href ? 'page' : undefined}
                  onPointerEnter={(event) => point(channel.id, event)}
                  onPointerLeave={() => clearTimeout(aimTimer.current)}
                  onPointerDown={(event) => {
                    touched.current = event.pointerType !== 'mouse' && !isActive ? channel.id : null;
                  }}
                  onPointerCancel={() => {
                    touched.current = null;
                  }}
                  onFocus={() => activate(channel.id)}
                  onClick={(event) => {
                    // A finger can't point first: its first tap on a channel shows the agents, the next opens it.
                    if (touched.current === channel.id && event.detail > 0) {
                      touched.current = null;
                      event.preventDefault();
                      activate(channel.id);

                      return;
                    }
                    if (opensHere(event)) hide();
                  }}
                />
                {/* Beside the channels, at the same place for each: only the channel in use shows its own. */}
                <ul
                  ref={(node) => {
                    agentLists.current[channel.id] = node;
                  }}
                  aria-label={`${agentsLabel}: ${channel.name}`}
                  data-active={isActive}
                  className={cn(
                    'absolute top-10 left-64 flex w-47 flex-col gap-0.5',
                    !isActive && 'pointer-events-none opacity-0'
                  )}
                >
                  {channel.agents.map((agent) => (
                    <li key={agent.id}>
                      <SiteAgentLink
                        agent={agent}
                        aria-current={pathname === agent.href ? 'page' : undefined}
                        onFocus={() => activate(channel.id)}
                        onClick={(event) => {
                          if (opensHere(event)) hide();
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
