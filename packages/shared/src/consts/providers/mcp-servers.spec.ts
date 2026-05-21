import { describe, expect, it } from 'vitest';
import { McpConnectionAuthModeEnum } from '../../dto/agent/managed-runtime.dto';
import { MCP_SERVERS, type McpOAuthCatalogEntry } from './mcp-servers';

describe('MCP_SERVERS catalog', () => {
  describe('oauth field', () => {
    it("marks a known DCR entry with oauth.mode === 'dcr'", () => {
      const sentry = MCP_SERVERS.find((entry) => entry.id === 'sentry');

      expect(sentry).toBeDefined();
      expect(sentry?.oauth?.mode).toBe(McpConnectionAuthModeEnum.Dcr);
    });

    it('leaves unsupported entries without an oauth field', () => {
      const slack = MCP_SERVERS.find((entry) => entry.id === 'slack');

      expect(slack).toBeDefined();
      expect(slack?.oauth).toBeUndefined();
    });

    it('covers every DCR-verified MCP', () => {
      const expectedDcrIds = new Set([
        'ahrefs',
        'airtable',
        'amplitude',
        'asana',
        'attio',
        'canva',
        'cloudflare',
        'datadog',
        'intercom',
        'linear',
        'mixpanel',
        'neon',
        'notion',
        'sentry',
        'stripe',
        'supabase',
      ]);
      const actualDcrIds = new Set(
        MCP_SERVERS.filter((entry) => entry.oauth?.mode === McpConnectionAuthModeEnum.Dcr).map((entry) => entry.id)
      );

      expect(actualDcrIds).toEqual(expectedDcrIds);
    });
  });

  /**
   * Compile-time exhaustiveness check for the discriminated union. If a new
   * mode is added to `McpOAuthCatalogEntry` without updating downstream
   * consumers, this function fails to type-check (the `never` assignment
   * breaks on the unhandled branch).
   */
  describe('McpOAuthCatalogEntry discriminated union', () => {
    it('is exhaustive', () => {
      function assertExhaustive(entry: McpOAuthCatalogEntry): string {
        switch (entry.mode) {
          case McpConnectionAuthModeEnum.Dcr:
            return entry.applicationType ?? 'web';
          case McpConnectionAuthModeEnum.NovuApp:
            return entry.issuer;
          case McpConnectionAuthModeEnum.UserApp:
            return entry.issuer;
          default: {
            const _exhaustive: never = entry;

            return _exhaustive;
          }
        }
      }

      expect(assertExhaustive({ mode: McpConnectionAuthModeEnum.Dcr })).toBe('web');
    });
  });
});
