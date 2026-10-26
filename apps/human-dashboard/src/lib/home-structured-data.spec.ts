import { describe, expect, it } from 'vitest';

import { HOME_HOSTS, HOME_QUICKSTART } from '@/data/home';
import { homeStructuredNodes } from './home-structured-data';
import { contentStructuredData, SITE_ORIGIN, SITE_PAGES } from './seo';

describe('publisher organization', () => {
  const organization = contentStructuredData(SITE_PAGES.home)['@graph'].find(
    (node) => node['@type'] === 'Organization'
  );

  it('names Novu with the office and support address it publishes', () => {
    expect(organization).toMatchObject({
      name: 'Novu',
      legalName: 'Noti-Fire Apps Ltd.',
      description: expect.stringContaining('Agent Inbox'),
      email: 'support@novu.co',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Derech Ben Gurion 132',
        addressLocality: 'Ramat Gan',
        addressCountry: 'IL',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@novu.co',
      },
      sameAs: ['https://github.com/novuhq'],
    });
    expect(organization).not.toHaveProperty('telephone');

    if (!organization || !('contactPoint' in organization)) {
      throw new Error('Organization node missing');
    }

    expect(organization.contactPoint).not.toHaveProperty('telephone');
  });
});

describe('home structured nodes', () => {
  const nodes = homeStructuredNodes();

  it('adds a software application, the quickstart, and the host list', () => {
    expect(nodes.map((node) => node['@type'])).toEqual(['SoftwareApplication', 'HowTo', 'ItemList']);
  });

  it('keeps the quickstart steps in the order the page prints them', () => {
    const quickstart = nodes.find((node) => node['@type'] === 'HowTo');
    const texts = quickstart?.step.map((step) => step.text) ?? [];

    expect(texts[0]).toContain('npm install -g @agentinbox/cli');
    expect(texts[0]).toContain('https://mcp.agentinbox.md');
    for (const command of HOME_QUICKSTART) {
      const line = command.parts
        .map((part) => part.text)
        .join('')
        .trim();
      expect(texts.some((text) => text.includes(line))).toBe(true);
    }
    expect(quickstart?.step.some((step) => 'offers' in step)).toBe(false);
  });

  it('lists each host the page links to', () => {
    const hosts = nodes.find((node) => node['@type'] === 'ItemList');

    expect(hosts?.itemListElement.map((item) => item.url)).toEqual(
      HOME_HOSTS.map((host) => `${SITE_ORIGIN}${host.href}`)
    );
  });

  it('does not invent a price or a rating for the CLI', () => {
    const software = nodes.find((node) => node['@type'] === 'SoftwareApplication');

    expect(software).not.toHaveProperty('offers');
    expect(software).not.toHaveProperty('aggregateRating');
  });
});
