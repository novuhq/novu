import { describe, expect, it } from 'vitest';
import { McpConnectionAuthModeEnum } from '../../dto/agent/managed-runtime.dto';
import { MCP_SERVERS, type McpOAuthCatalogEntry, type NovuAppOAuthCatalogEntry } from './mcp-servers';

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
        'atlassian-rovo',
        'attio',
        'brex',
        'canva',
        'cloudflare',
        'datadog',
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

    it('covers every novu-app MCP', () => {
      const expectedNovuAppIds = new Set(['github']);
      const actualNovuAppIds = new Set(
        MCP_SERVERS.filter((entry) => entry.oauth?.mode === McpConnectionAuthModeEnum.NovuApp).map((entry) => entry.id)
      );

      expect(actualNovuAppIds).toEqual(expectedNovuAppIds);
    });

    it('pins authorize/token endpoints + scopes on the GitHub novu-app entry', () => {
      const github = MCP_SERVERS.find((entry) => entry.id === 'github');

      expect(github).toBeDefined();
      expect(github?.oauth?.mode).toBe(McpConnectionAuthModeEnum.NovuApp);
      const oauth = github?.oauth as NovuAppOAuthCatalogEntry;
      expect(oauth.issuer).toBe('https://github.com');
      expect(oauth.authorizationEndpoint).toBe('https://github.com/login/oauth/authorize');
      expect(oauth.tokenEndpoint).toBe('https://github.com/login/oauth/access_token');
      expect(oauth.scopes).toEqual([
        'repo',
        'read:org',
        'read:user',
        'user:email',
        'read:packages',
        'write:packages',
        'read:project',
        'project',
        'gist',
        'notifications',
        'workflow',
        'codespace',
      ]);
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
