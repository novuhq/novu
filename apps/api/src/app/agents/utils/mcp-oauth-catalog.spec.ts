import { MCP_SERVERS } from '@novu/shared';
import { expect } from 'chai';

import { getMcpOAuthCatalogEntry, getMcpOAuthMode } from './mcp-oauth-catalog';

describe('MCP OAuth Catalog', () => {
  describe('alignment with MCP_SERVERS', () => {
    /**
     * Every server-only catalog entry must point at a real `MCP_SERVERS` row.
     * Otherwise the user picker has no row that surfaces the auth flow, and
     * the dashboard's `oauthMode` hint will never resolve. The catalog file
     * is the source of truth for the runtime allow-list; this test fails the
     * build if the two drift.
     */
    it('every catalog entry has a matching MCP_SERVERS entry', () => {
      const orphans: string[] = [];

      for (const server of MCP_SERVERS) {
        const entry = getMcpOAuthCatalogEntry(server.id);

        if (entry.mode !== 'none') {
          continue;
        }

        if (server.oauthMode === 'novu') {
          orphans.push(server.id);
        }
      }

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
