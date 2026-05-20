import { MCP_SERVERS } from '@novu/shared';
import { expect } from 'chai';

import { getMcpOAuthCatalogEntry, getMcpOAuthCatalogIds, getMcpOAuthMode } from './mcp-oauth-catalog';

describe('MCP OAuth Catalog', () => {
  describe('alignment with MCP_SERVERS', () => {
    /**
     * Stale catalog rot guard. Walks the server-only allow-list (NOT
     * `MCP_SERVERS`) so we catch ids that exist only in `MCP_OAUTH_CATALOG` —
     * the previous, MCP_SERVERS-driven walk silently missed those. A failing
     * assertion means the allow-list still references an MCP that's been
     * removed from the shared catalog and should be cleaned up.
     */
    it('every catalog entry has a matching MCP_SERVERS entry', () => {
      const mcpServerIds = new Set(MCP_SERVERS.map((server) => server.id));
      const orphans = getMcpOAuthCatalogIds().filter((id) => !mcpServerIds.has(id));

      expect(orphans, `MCP_OAUTH_CATALOG entries are missing from MCP_SERVERS: ${orphans.join(', ')}`).to.deep.equal(
        []
      );
    });
  });

  describe('getMcpOAuthCatalogEntry', () => {
    it("returns { mode: 'none' } for unknown ids", () => {
      expect(getMcpOAuthCatalogEntry('definitely-not-in-the-catalog')).to.deep.equal({ mode: 'none' });
    });

    it("returns { mode: 'novu' } for a known allow-listed entry", () => {
      expect(getMcpOAuthCatalogEntry('sentry').mode).to.equal('novu');
    });
  });

  describe('getMcpOAuthMode', () => {
    it("returns 'none' for ids not on the allow-list", () => {
      expect(getMcpOAuthMode('slack')).to.equal('none');
    });

    it("returns 'novu' for allow-listed ids", () => {
      expect(getMcpOAuthMode('linear')).to.equal('novu');
    });
  });
});
