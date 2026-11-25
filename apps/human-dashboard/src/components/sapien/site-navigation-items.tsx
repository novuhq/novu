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
/** The small-screen menu's own drawings (Figma `1694:9934`): a 16px chevron, its arrow, and the 44px source button. */
const MENU_CHEVRON: NavigationIcon = { src: '/images/navigation/chevron-down-16.svg', width: 16, height: 16 };
const MENU_ARROW: NavigationIcon = { src: '/images/navigation/arrow-right.svg', width: 16, height: 16 };
const MENU_SOURCE_MARK: NavigationIcon = { src: '/images/navigation/github-44.svg', width: 44, height: 44 };

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
 * so a phone never fetches the desktop row's. `eager` is for a panel that has no place until it opens, and
 * `scale` for where Figma draws the same file larger.
 */
function NavigationArt({
  icon,
  eager = false,
  scale = 1,
  className,
}: {
  icon: NavigationIcon;
  eager?: boolean;
  scale?: number;
  className?: string;
}) {
  const width = icon.width * scale;
  const height = icon.height * scale;

  return (
    <Image
      src={icon.src}
      width={Math.round(width)}
      height={Math.round(height)}
      alt=""
      unoptimized
      loading={eager ? 'eager' : 'lazy'}
      style={{ width, height }}
      className={cn('pointer-events-none max-w-none shrink-0', className)}
    />
  );
}

/**
 * Points down; a control that is open (`aria-expanded`) turns it up. The row's is 12px, at 70% until its menu
 * opens; the small-screen menu's is its own 16px drawing at full strength.
 */
export function NavigationChevron({ menu = false }: { menu?: boolean }) {
  return (
    <NavigationArt
      icon={menu ? MENU_CHEVRON : CHEVRON}
      eager={menu}
      className={cn(
        'transition-[opacity,rotate] duration-150 group-aria-expanded/trigger:rotate-180 motion-reduce:transition-none',
        !menu && 'opacity-70 group-aria-expanded/trigger:opacity-100'
      )}
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
 * to the colour the other dark buttons turn. `menu` is the small-screen menu's 44px button, its own drawing.
 */
export function SiteSourceLink({
  link,
  menu = false,
  className,
  ...props
}: { link: { label: string; href: string }; menu?: boolean } & Omit<ComponentProps<'a'>, 'href' | 'children'>) {
  return (
    <a
      href={link.href}
      aria-label={link.label}
      className={cn(
        'relative grid shrink-0 place-items-center overflow-clip rounded-sm bg-sapien-border after:absolute after:inset-0 after:bg-sapien-foreground/0 after:transition-colors after:duration-150 hover:after:bg-sapien-foreground/6 motion-reduce:after:transition-none',
        menu ? 'size-11' : 'size-8',
        className
      )}
      {...props}
    >
      <NavigationArt icon={menu ? MENU_SOURCE_MARK : SOURCE_MARK} eager={menu} />
    </a>
  );
}

/** A channel in the header's menu: its mark on a tile, its name, and what the agent gets there. */
export function SiteChannelLink({
  channel,
  active = false,
  className,
  ...props
}: { channel: NavigationChannel; active?: boolean } & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
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
        <NavigationArt icon={channel.icon} />
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

/**
 * A channel in the small-screen menu (Figma `1693:5380`): the same tile, a larger name over a quieter line, and
 * an arrow at the far end. No padding of its own: the tile starts where the list does.
 */
export function SiteMenuChannelLink({
  channel,
  className,
  ...props
}: { channel: NavigationChannel } & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  return (
    <Link href={channel.href} className={cn('flex items-center gap-3 rounded-sm', className)} {...props}>
      <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-sapien-surface bg-[#0d0c0b]">
        <NavigationArt icon={channel.icon} eager />
      </span>
      {/* Lines of 19px and 18px: Figma's 1.25, rounded up to whole pixels as it rounds a text's box. */}
      <span className="flex min-w-0 flex-col gap-0.5 tracking-tight whitespace-nowrap">
        <span className="text-[15px] leading-[19px] text-sapien-foreground">{channel.name}</span>
        <span className="text-sm leading-[18px] text-sapien-foreground/50">{channel.description}</span>
      </span>
      <NavigationArt icon={MENU_ARROW} className="ml-auto" />
    </Link>
  );
}

/**
 * An agent's page on a channel: the agent's logo tile and its name. `menu` is the small-screen menu's row
 * (Figma `1693:5427`): an 18px tile, with the logo as much larger, and no padding at its sides.
 */
export function SiteAgentLink({
  agent,
  menu = false,
  className,
  ...props
}: { agent: NavigationAgent; menu?: boolean } & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  return (
    <Link
      href={agent.href}
      className={cn(
        'flex items-center gap-1.5 py-2 text-sm tracking-tight whitespace-nowrap text-sapien-foreground/70 transition-colors duration-150 hover:text-sapien-foreground focus-visible:-outline-offset-2 motion-reduce:transition-none',
        menu ? 'rounded-sm leading-[18px]' : 'rounded-[9px] px-3 leading-none',
        className
      )}
      {...props}
    >
      {/* The hairline is drawn inside the tile, not as a border: a border takes a whole pixel from a 16px logo. */}
      <span
        className={cn(
          'grid shrink-0 place-items-center overflow-clip inset-ring-[0.25px] inset-ring-white/8',
          menu ? 'size-4.5 rounded-sm' : 'size-4 rounded-[3.5px]',
          agent.tile === 'claude' ? 'bg-[#da7757]' : 'bg-white'
        )}
      >
        <NavigationArt icon={agent.icon} scale={menu ? 1.125 : 1} />
      </span>
      {agent.name}
    </Link>
  );
}
