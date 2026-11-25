import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { hasAgentPage } from './channel-pages';
import { FOOTER_LINKS, HEADER_ACTIONS, HEADER_LINKS, NAVIGATION_CHANNELS, SOURCE_LINK } from './site-navigation';

const publicFile = (src: string) => fileURLToPath(new URL(`../../public${src}`, import.meta.url));

describe('site navigation', () => {
  it('lists the channels with what the agent gets on each, as the design words it', () => {
    expect(NAVIGATION_CHANNELS.map(({ name, description, href }) => ({ name, description, href }))).toEqual([
      { name: 'Email', description: 'Its own email address', href: '/email' },
      { name: 'Telegram', description: 'Its own Telegram bot', href: '/telegram' },
      { name: 'Slack', description: 'Its own Slack app', href: '/slack' },
    ]);
  });

  it("offers the design's agents under each channel, in its order", () => {
    expect(
      Object.fromEntries(NAVIGATION_CHANNELS.map((channel) => [channel.id, channel.agents.map(({ name }) => name)]))
    ).toEqual({
      email: ['OpenClaw'],
      telegram: ['OpenClaw', 'Claude Code', 'Hermes'],
      slack: ['Claude Code', 'OpenClaw', 'Codex', 'Cursor'],
    });
  });

  it('links every agent to a page that exists', () => {
    for (const channel of NAVIGATION_CHANNELS)
      for (const agent of channel.agents) {
        expect(hasAgentPage(channel.id, agent.id), agent.href).toBe(true);
        expect(agent.href).toBe(`/${channel.id}/${agent.id}`);
      }
  });

  it('keeps the pages in the header and the package in the footer', () => {
    expect(HEADER_LINKS.map(({ label, href }) => [label, href])).toEqual([
      ['use cases', '/use-cases'],
      ['pricing', '/pricing'],
    ]);
    expect(HEADER_ACTIONS.map(({ label, href, variant }) => [label, href, variant])).toEqual([
      ['dashboard', '/inbox', undefined],
      ['book a demo', 'https://cal.com/team/novu/novu-meeting', 'primary'],
    ]);
    expect(FOOTER_LINKS.map(({ label, href }) => [label, href])).toEqual([
      ['npm', 'https://www.npmjs.com/package/@agentinbox/cli'],
      ['for robots', '/'],
    ]);
    expect(SOURCE_LINK.href).toBe('https://github.com/novuhq/novu/tree/next/packages/agentinbox');
  });

  it("draws every icon at its file's own size", () => {
    const icons = NAVIGATION_CHANNELS.flatMap((channel) => [channel.icon, ...channel.agents.map(({ icon }) => icon)]);
    expect(icons).toHaveLength(11);
    for (const icon of icons) {
      const root = readFileSync(publicFile(icon.src), 'utf8').match(/<svg[^>]*>/)?.[0] ?? '';
      expect(Number(root.match(/ width="([\d.]+)"/)?.[1]), icon.src).toBe(icon.width);
      expect(Number(root.match(/ height="([\d.]+)"/)?.[1]), icon.src).toBe(icon.height);
    }
  });
});
