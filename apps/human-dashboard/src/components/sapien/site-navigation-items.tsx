import Image from 'next/image';
import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';

import type { NavigationAgent, NavigationChannel, NavigationIcon, NavigationLink } from '@/data/site-navigation';
import { cn } from '@/lib/utils';

/*
 * What the header, its menus and the footer are made of (Figma `1632:32002`). No state here, and nothing from
 * the data files but their types: the menus are client components, and what they show reaches them as props.
 */

const CHEVRON: NavigationIcon = { src: '/images/navigation/chevron-down.svg', width: 12, height: 12 };
const SOURCE_MARK: NavigationIcon = { src: '/images/navigation/github.svg', width: 32, height: 32 };

/**
 * A header link: 13px Geist Mono at 70%, full on hover. Its box is taller than its text, for the pointer, and
 * a pixel shorter below, which puts the text's line at 18px from the top of the 50px header, as Figma has it.
 * Figma rounds a text's box up to whole pixels and sets its 4px gap after that: 5px after the text itself.
 */
export const NAVIGATION_LINK_CLASS =
  'inline-flex h-8 items-center gap-1.25 rounded-sm pb-px font-sapien-mono text-[13px] leading-none tracking-tight whitespace-nowrap text-sapien-foreground/70 transition-colors duration-150 hover:text-sapien-foreground motion-reduce:transition-none';

/** A click that opens its link here, not in another tab or window: the one a menu closes behind. */
export function opensHere(event: MouseEvent): boolean {
  return event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

/**
 * A drawing from the navigation design, at the size Figma draws it: the style keeps a width such as 10.5335px,
 * and the attributes get the whole numbers the browser reads them as. It loads once it has a place on the page,
 * so a phone never fetches the desktop row's. `eager` is for a panel that has no place until it opens.
 */
function NavigationArt({
  icon,
  eager = false,
  className,
}: {
  icon: NavigationIcon;
  eager?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={icon.src}
      width={Math.round(icon.width)}
      height={Math.round(icon.height)}
      alt=""
      unoptimized
      loading={eager ? 'eager' : 'lazy'}
      style={{ width: icon.width, height: icon.height }}
      className={cn('pointer-events-none max-w-none shrink-0', className)}
    />
  );
}

/** Points down at 70%; a control that is open (`aria-expanded`) turns it up at full strength. */
export function NavigationChevron({ eager, size = CHEVRON.width }: { eager?: boolean; size?: number }) {
  return (
    <NavigationArt
      icon={{ ...CHEVRON, width: size, height: size }}
      eager={eager}
      className="opacity-70 transition-[opacity,rotate] duration-150 group-aria-expanded/trigger:rotate-180 group-aria-expanded/trigger:opacity-100 motion-reduce:transition-none"
    />
  );
}

/**
 * The 32px Geist Mono button. Its address is the dashboard, the page for agents or another site: none of them
 * shares this page's layout, so it loads as a document.
 */
export function SiteButtonLink({
  link,
  className,
  ...props
}: { link: NavigationLink } & Omit<ComponentProps<'a'>, 'href' | 'children'>) {
  return (
    <a
      href={link.href}
      className={cn(
        // 16px at each side of a text box that Figma rounds up to whole pixels: half a pixel more keeps its widths.
        'inline-flex h-8 shrink-0 items-center justify-center rounded-sm px-[16.5px] font-sapien-mono text-sm leading-none tracking-tight whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none',
        link.variant === 'primary'
          ? 'bg-sapien-foreground text-black hover:bg-white'
          : 'bg-sapien-border text-sapien-foreground hover:bg-sapien-surface',
        className
      )}
      {...props}
    >
      {link.label}
    </a>
  );
}

/**
 * The GitHub mark on its tile. The tile's colour is part of the drawing, so hovering lightens it from above,
 * to the colour the other dark buttons turn.
 */
export function SiteSourceLink({
  link,
  eager,
  className,
  ...props
}: { link: { label: string; href: string }; eager?: boolean } & Omit<ComponentProps<'a'>, 'href' | 'children'>) {
  return (
    <a
      href={link.href}
      aria-label={link.label}
      className={cn(
        'relative grid size-8 shrink-0 place-items-center overflow-clip rounded-sm bg-sapien-border after:absolute after:inset-0 after:bg-sapien-foreground/0 after:transition-colors after:duration-150 hover:after:bg-sapien-foreground/6 motion-reduce:after:transition-none',
        className
      )}
      {...props}
    >
      <NavigationArt icon={SOURCE_MARK} eager={eager} />
    </a>
  );
}

/** A channel in a menu: its mark on a tile, its name, and what the agent gets there. */
export function SiteChannelLink({
  channel,
  active = false,
  eager,
  className,
  ...props
}: { channel: NavigationChannel; active?: boolean; eager?: boolean } & Omit<
  ComponentProps<typeof Link>,
  'href' | 'children'
>) {
  return (
    <Link
      href={channel.href}
      className={cn(
        'flex items-center gap-2.5 rounded-md p-3 transition-colors duration-150 focus-visible:-outline-offset-2 motion-reduce:transition-none',
        active && 'bg-sapien-border',
        className
      )}
      {...props}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-sapien-surface bg-[#0d0c0b]">
        <NavigationArt icon={channel.icon} eager={eager} />
      </span>
      <span className="flex min-w-0 flex-col gap-1 text-sm whitespace-nowrap">
        <span className="leading-none tracking-tight text-sapien-foreground">{channel.name}</span>
        <span
          className={cn(
            'leading-[1.25] tracking-[-0.025em] transition-colors duration-150 motion-reduce:transition-none',
            active ? 'text-sapien-foreground/50' : 'text-sapien-foreground/70'
          )}
        >
          {channel.description}
        </span>
      </span>
    </Link>
  );
}

/** An agent's page on a channel: the agent's logo tile and its name. */
export function SiteAgentLink({
  agent,
  className,
  ...props
}: { agent: NavigationAgent } & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  return (
    <Link
      href={agent.href}
      className={cn(
        'flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-sm leading-none tracking-tight whitespace-nowrap text-sapien-foreground/70 transition-colors duration-150 hover:text-sapien-foreground focus-visible:-outline-offset-2 motion-reduce:transition-none',
        className
      )}
      {...props}
    >
      {/* The hairline is drawn inside the tile, not as a border: a border takes a whole pixel from a 16px logo. */}
      <span
        className={cn(
          'grid size-4 shrink-0 place-items-center overflow-clip rounded-[3.5px] inset-ring-[0.25px] inset-ring-white/8',
          agent.tile === 'claude' ? 'bg-[#da7757]' : 'bg-white'
        )}
      >
        <NavigationArt icon={agent.icon} />
      </span>
      {agent.name}
    </Link>
  );
}
