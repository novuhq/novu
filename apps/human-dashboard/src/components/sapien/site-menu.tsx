'use client';

import { usePathname } from 'next/navigation';
import { type MouseEvent, useEffect, useId, useRef, useState } from 'react';

import type { NavigationChannel, NavigationLink } from '@/data/site-navigation';
import { cn } from '@/lib/utils';

import {
  NavigationChevron,
  opensHere,
  SiteAgentLink,
  SiteButtonLink,
  SiteMenuChannelLink,
  SiteSourceLink,
} from './site-navigation-items';
import { SiteNavigationLink } from './site-navigation-link';

/** A row of the panel's list (Figma `1693:5324`): 56px with the line under it, the header's type at 20px. */
const ROW_CLASS =
  'flex h-14 w-full items-center border-b border-sapien-border px-3 font-sapien-mono text-xl leading-none tracking-tight text-sapien-foreground transition-colors duration-150 hover:text-accent focus-visible:-outline-offset-2 motion-reduce:transition-none';

/**
 * Small-screen header navigation (Figma `1694:9934`): a disclosure button that shows the header's destinations
 * in a panel from under the header to the bottom of the window: the row's three items as one list, channels,
 * use cases and pricing, and its buttons in a row at the foot. Channels opens in place: each channel with a link
 * to its page, and under it the agents to connect there, one to a line. It closes on Escape, a link followed, or
 * the focus moving on, and the page behind keeps its place meanwhile.
 */
export function SiteMenu({
  label,
  channelsLabel,
  agentsLabel,
  channels,
  links,
  actions,
  source,
  className,
}: {
  label: string;
  channelsLabel: string;
  agentsLabel: string;
  channels: readonly NavigationChannel[];
  links: readonly NavigationLink[];
  actions: readonly NavigationLink[];
  source: { label: string; href: string };
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const channelsId = `${panelId}-channels`;
  /** A link opened in another tab leaves the menu as it is. */
  const close = (event: MouseEvent) => {
    if (opensHere(event)) setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    // A window grown wide enough for the row has no Menu button left to close the panel with.
    const row = matchMedia('(min-width: 64rem)');
    const onRow = () => {
      if (row.matches) setOpen(false);
    };
    // The panel covers the window: the page behind it stays put, with the room its scrollbar had.
    const page = document.documentElement;
    const { overflow, scrollbarGutter } = page.style;
    page.style.overflow = 'hidden';
    page.style.scrollbarGutter = 'stable';
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    row.addEventListener('change', onRow);
    return () => {
      page.style.overflow = overflow;
      page.style.scrollbarGutter = scrollbarGutter;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      row.removeEventListener('change', onRow);
    };
  }, [open]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: it only watches the focus; the button and the links in it are the controls
    <div
      ref={root}
      className={className}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setChannelsOpen(false);
          setOpen((current) => !current);
        }}
        className={cn(
          'grid size-8.5 cursor-pointer place-items-center rounded border border-sapien-border text-white transition-colors duration-150 hover:bg-sapien-border motion-reduce:transition-none',
          open && 'bg-sapien-border'
        )}
      >
        <MenuIcon open={open} />
      </button>
      {/*
       * From under the 50px header and its line to the bottom of the window. Black from one edge of the window
       * to the other, with the column's rails carried down it; what is in it scrolls when the window is short.
       */}
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-[calc(100%+1px)] z-[15] h-[calc(100dvh-51px)] transition-[opacity,translate] duration-150 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:bg-black after:pointer-events-none after:absolute after:inset-y-0 after:-inset-x-[0.5px] after:border-x after:border-sapien-border motion-reduce:transition-none starting:-translate-y-1 starting:opacity-0"
      >
        <nav
          aria-label={label}
          className="flex h-full flex-col overflow-y-auto overscroll-contain px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <ul className="flex flex-col">
            <li>
              {/* Open, the line moves from under the row to under its channels. */}
              <button
                type="button"
                aria-expanded={channelsOpen}
                aria-controls={channelsId}
                onClick={() => setChannelsOpen((current) => !current)}
                className={cn(
                  ROW_CLASS,
                  'group/trigger cursor-pointer justify-between aria-expanded:border-transparent'
                )}
              >
                {channelsLabel}
                <NavigationChevron menu />
              </button>
              <ul
                id={channelsId}
                hidden={!channelsOpen}
                className="flex flex-col gap-8 border-b border-sapien-border px-3 pt-1 pb-5 transition-[opacity,translate] duration-150 motion-reduce:transition-none starting:-translate-y-1 starting:opacity-0"
              >
                {channels.map((channel) => (
                  <li key={channel.id} className="flex flex-col gap-4">
                    <SiteMenuChannelLink
                      channel={channel}
                      aria-current={pathname === channel.href ? 'page' : undefined}
                      onClick={close}
                    />
                    <div className="flex flex-col gap-2">
                      <p
                        aria-hidden="true"
                        className="font-sapien-mono text-[10px] leading-none tracking-tight text-sapien-foreground/70 uppercase"
                      >
                        {agentsLabel}
                      </p>
                      <ul aria-label={`${agentsLabel}: ${channel.name}`} className="flex flex-col gap-0.5">
                        {channel.agents.map((agent) => (
                          <li key={agent.id}>
                            <SiteAgentLink
                              agent={agent}
                              menu
                              aria-current={pathname === agent.href ? 'page' : undefined}
                              onClick={close}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
            {links.map((link) => (
              <li key={link.href}>
                <SiteNavigationLink href={link.href} onClick={close} className={ROW_CLASS}>
                  {link.label}
                </SiteNavigationLink>
              </li>
            ))}
          </ul>
          {/* The header's buttons, at the foot of the window, or right after the list when the window is too short to part them. */}
          <div className="mt-auto flex items-center gap-2 pt-px">
            <SiteSourceLink link={source} menu onClick={close} />
            {actions.map((link) => (
              <SiteButtonLink key={link.href} link={link} onClick={close} className="h-11 flex-1 shrink px-2" />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

/** Figma's "menu-7" icon (20×20, three bars), and a matching close icon when open. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      {open ? (
        <>
          <rect x="2" y="9.375" width="16" height="1.25" rx="0.3125" transform="rotate(45 10 10)" />
          <rect x="2" y="9.375" width="16" height="1.25" rx="0.3125" transform="rotate(-45 10 10)" />
        </>
      ) : (
        <>
          <rect x="0.625" y="3.75" width="18.75" height="1.25" rx="0.3125" />
          <rect x="0.625" y="9.375" width="11.875" height="1.25" rx="0.3125" />
          <rect x="0.625" y="15" width="18.75" height="1.25" rx="0.3125" />
        </>
      )}
    </svg>
  );
}
