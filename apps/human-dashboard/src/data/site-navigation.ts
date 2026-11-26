import { AGENTS, type AgentId, CHANNEL_IDS, CHANNELS, type ChannelId } from '@/data/channel-pages';
import { BOOK_DEMO_HREF } from '@/data/sapien-scale';
import { INBOX_PATH } from '@/lib/inbox';
import { PACKAGE_URL, SOURCE_URL } from '@/lib/seo';

/*
 * The website's header and footer (Figma file "Human.md", section `1632:32002`): the channels with the agents
 * the design lists for each, the pages beside them, and the buttons. A server component reads this and hands
 * the menus what they show, so the channel pages' copy stays out of the browser.
 */

/** A drawing from the navigation design, at the size Figma draws it. */
export type NavigationIcon = { src: string; width: number; height: number };

/** `light` is the white logo tile; `claude` is Claude's own orange. */
type NavigationAgentTile = 'light' | 'claude';

export type NavigationAgent = {
  id: AgentId;
  name: string;
  href: string;
  icon: NavigationIcon;
  tile: NavigationAgentTile;
};

export type NavigationChannel = {
  id: ChannelId;
  name: string;
  description: string;
  href: string;
  icon: NavigationIcon;
  agents: readonly NavigationAgent[];
};

export type NavigationLink = {
  label: string;
  href: string;
  /** The light button: one per row, for what the row is there to offer. */
  variant?: 'primary';
};

const AGENT_TILES = {
  openclaw: { icon: { src: '/images/navigation/agent-openclaw.svg', width: 14, height: 14 }, tile: 'light' },
  'claude-code': { icon: { src: '/images/navigation/agent-claude-code.svg', width: 12, height: 12 }, tile: 'claude' },
  hermes: { icon: { src: '/images/navigation/agent-hermes.svg', width: 16, height: 16 }, tile: 'light' },
  codex: { icon: { src: '/images/navigation/agent-codex.svg', width: 12, height: 12 }, tile: 'light' },
  cursor: { icon: { src: '/images/navigation/agent-cursor.svg', width: 10.5335, height: 12 }, tile: 'light' },
} satisfies Partial<Record<AgentId, { icon: NavigationIcon; tile: NavigationAgentTile }>>;

type NavigationAgentId = keyof typeof AGENT_TILES;

/**
 * The agents the menu offers under "Connect an agent", in the design's order. Every agent has a page on every
 * channel; the menu names these, and a channel's own page lists the rest. The panel has room for five.
 */
const CHANNEL_MENU: Record<ChannelId, { icon: NavigationIcon; agents: readonly NavigationAgentId[] }> = {
  email: {
    icon: { src: '/images/navigation/channel-email.svg', width: 13, height: 13 },
    agents: ['openclaw'],
  },
  telegram: {
    icon: { src: '/images/navigation/channel-telegram.svg', width: 16, height: 16 },
    agents: ['openclaw', 'claude-code', 'hermes'],
  },
  slack: {
    icon: { src: '/images/navigation/channel-slack.svg', width: 12.9944, height: 13.0001 },
    agents: ['claude-code', 'openclaw', 'codex', 'cursor'],
  },
};

export const NAVIGATION_CHANNELS: readonly NavigationChannel[] = CHANNEL_IDS.map((channel) => ({
  id: channel,
  name: CHANNELS[channel].name,
  description: `Its own ${CHANNELS[channel].noun}`,
  href: `/${channel}`,
  icon: CHANNEL_MENU[channel].icon,
  agents: CHANNEL_MENU[channel].agents.map((agent) => ({
    id: agent,
    name: AGENTS[agent].name,
    href: `/${channel}/${agent}`,
    ...AGENT_TILES[agent],
  })),
}));

export const CHANNELS_MENU_LABEL = 'channels';
export const CHANNELS_MENU_AGENTS_LABEL = 'Connect an agent';

/** The pages beside the channels menu. */
export const HEADER_LINKS: readonly NavigationLink[] = [
  { label: 'use cases', href: '/use-cases' },
  { label: 'pricing', href: '/pricing' },
];

/**
 * The header's buttons. The dashboard opens the inbox: someone who is signed out signs in on the way, and
 * someone who is already signed in lands on the inbox.
 */
export const HEADER_ACTIONS: readonly NavigationLink[] = [
  { label: 'dashboard', href: INBOX_PATH },
  { label: 'book a demo', href: BOOK_DEMO_HREF, variant: 'primary' },
];

/** The footer's buttons: the package, and the page for agents. */
export const FOOTER_LINKS: readonly NavigationLink[] = [
  { label: 'npm', href: PACKAGE_URL },
  { label: 'for robots', href: '/' },
];

/** The CLI's source, behind the GitHub mark in the header and the footer. */
export const SOURCE_LINK = { label: 'GitHub', href: SOURCE_URL } as const;
