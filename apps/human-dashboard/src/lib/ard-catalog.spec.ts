import { describe, expect, it } from 'vitest';

import { GET } from '../app/.well-known/ard.json/route';
import { ARD_HREF, ARD_PATH, type ArdEntry, ardCatalog, mcpServerCard } from './ard-catalog';
import { llmsIndex } from './home-markdown';
import { MCP_URL } from './hosts';
import { SITE_ORIGIN } from './seo';

const IDENTIFIER = /^urn:air:agentinbox\.md(?::[a-zA-Z0-9._-]+)+$/;

describe('ardCatalog', () => {
  const catalog = ardCatalog();

  it('publishes the MCP server and the skills index as ARD entries', () => {
    expect(catalog.entries.map((entry) => entry.type)).toEqual([
      'application/mcp-server-card+json',
      'application/agent-skills+json',
    ]);
    expect(catalog.entries.map((entry) => entry.identifier)).toEqual([
      'urn:air:agentinbox.md:mcp:inbox',
      'urn:air:agentinbox.md:skills:index',
    ]);
  });

  it('gives every entry the terms a client needs to find and fetch the resource', () => {
    for (const entry of catalog.entries) {
      expect(entry.identifier).toMatch(IDENTIFIER);
      expect(entry.displayName.length).toBeGreaterThan(0);
      expect(entry['@context']).toBe('https://agenticresourcediscovery.org/context/v1');
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5);
      expect(entry.trustManifest).toEqual({ identity: 'https://agentinbox.md', identityType: 'https' });
      expect(hasUrl(entry) === hasData(entry)).toBe(false);
    }
  });

  it('inlines the MCP server card for the hosted server, and points skills at the discovery index', () => {
    const [mcp, skills] = catalog.entries;

    expect(mcp.data).toEqual(mcpServerCard());
    expect(mcp.data?.remotes).toEqual([
      {
        type: 'streamable-http',
        url: MCP_URL,
        supportedProtocolVersions: ['2025-06-18'],
      },
    ]);
    expect(mcp.capabilities).toContain('inbox_send');
    expect(mcp.capabilities).toContain('inbox_setup');
    expect(skills.url).toBe(`${SITE_ORIGIN}/.well-known/agent-skills/index.json`);
    expect(skills.capabilities).toEqual(['agentinbox', 'agentinbox-cli', 'agentinbox-mcp']);
  });

  it('serves the catalog at /.well-known/ard.json and tells /llms.txt where it is', async () => {
    const response = await GET();

    expect(ARD_PATH).toBe('/.well-known/ard.json');
    expect(ARD_HREF).toBe(`${SITE_ORIGIN}${ARD_PATH}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(await response.json()).toEqual(catalog);
    expect(llmsIndex()).toContain(ARD_HREF);
  });
});

function hasUrl(entry: ArdEntry): boolean {
  return 'url' in entry && entry.url !== undefined;
}

function hasData(entry: ArdEntry): boolean {
  return 'data' in entry && entry.data !== undefined;
}
