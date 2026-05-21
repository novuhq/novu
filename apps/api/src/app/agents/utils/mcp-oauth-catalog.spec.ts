import { MCP_SERVERS } from '@novu/shared';
import { expect } from 'chai';

import {
  getMcpOAuthCatalogEntry,
  getMcpOAuthCatalogIds,
  getMcpOAuthMode,
  type McpOAuthCatalogEntry,
} from './mcp-oauth-catalog';

describe('MCP OAuth Catalog', () => {
  describe('alignment with MCP_SERVERS', () => {
    /**
     * Stale catalog rot guard. Walks the server-only catalog so we catch ids
     * that exist only in `MCP_OAUTH_CATALOG` — a failing assertion means the
     * catalog still references an MCP that has been removed from the shared
     * `MCP_SERVERS` list and should be cleaned up.
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
    it('throws for unknown ids', () => {
      expect(() => getMcpOAuthCatalogEntry('definitely-not-in-the-catalog')).to.throw(
        /No MCP OAuth catalog entry for "definitely-not-in-the-catalog"/
      );
    });

    it("returns { mode: 'dcr' } for a known DCR entry", () => {
      expect(getMcpOAuthCatalogEntry('sentry').mode).to.equal('dcr');
    });
  });

  describe('getMcpOAuthMode', () => {
    it('throws for ids not in the catalog', () => {
      expect(() => getMcpOAuthMode('definitely-not-in-the-catalog')).to.throw(/No MCP OAuth catalog entry/);
    });

    it("returns 'dcr' for DCR-listed ids", () => {
      expect(getMcpOAuthMode('linear')).to.equal('dcr');
    });
  });

  /**
   * Compile-time exhaustiveness check for the discriminated union. If a new
   * mode is added to `McpOAuthCatalogMode` without updating downstream
   * consumers, this function fails to type-check (the `never` assignment
   * breaks on the unhandled branch).
   */
  it('discriminated union is exhaustive', () => {
    function assertExhaustive(entry: McpOAuthCatalogEntry): string {
      switch (entry.mode) {
        case 'dcr':
          return entry.applicationType ?? 'web';
        case 'novu-app':
          return entry.issuer;
        case 'user-app':
          return entry.issuer;
        default: {
          const _exhaustive: never = entry;

          return _exhaustive;
        }
      }
    }

    expect(assertExhaustive({ mode: 'dcr' })).to.equal('web');
  });
});
