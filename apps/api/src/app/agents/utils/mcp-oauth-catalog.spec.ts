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

    /**
     * Inverse check: every `MCP_SERVERS` row that declares `oauthMode: 'novu'`
     * must have a matching allow-list entry, otherwise the dashboard would
     * advertise Authorize CTAs for an MCP whose OAuth flow has no
     * server-side configuration.
     */
    it("every MCP_SERVERS entry with oauthMode='novu' has a catalog allow-list entry", () => {
      const orphans = MCP_SERVERS.filter((server) => server.oauthMode === 'novu')
        .map((server) => server.id)
        .filter((id) => getMcpOAuthCatalogEntry(id).mode === 'none');

      expect(
        orphans,
        `MCP_SERVERS entries claim oauthMode='novu' but are not in MCP_OAUTH_CATALOG: ${orphans.join(', ')}`
      ).to.deep.equal([]);
    });

    /**
     * The dashboard reads `oauthMode` directly off `MCP_SERVERS` (the catalog
     * file is server-only). If a catalog allow-list entry doesn't carry the
     * matching render hint, the dashboard will not display the Authorize
     * status for it.
     */
    it("every allow-listed catalog entry has oauthMode='novu' on its MCP_SERVERS row", () => {
      const allowListedIds = MCP_SERVERS.map((server) => server.id).filter((id) => getMcpOAuthMode(id) === 'novu');

      expect(allowListedIds.length, 'allow-list should be non-empty').to.be.greaterThan(0);

      for (const id of allowListedIds) {
        const server = MCP_SERVERS.find((entry) => entry.id === id);

        if (!server) {
          throw new Error(`MCP_SERVERS row missing for catalog id "${id}"`);
        }

        expect(
          server.oauthMode,
          `MCP_SERVERS["${id}"].oauthMode must be 'novu' to keep the dashboard hint in sync with the server-only catalog`
        ).to.equal('novu');
      }
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
