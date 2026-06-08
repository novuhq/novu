import { describe, expect, it } from 'vitest';
import { McpConnectionAuthModeEnum } from '../../dto/agent/managed-runtime.dto';
import {
  MCP_SERVERS,
  type McpOAuthCatalogEntry,
  type McpServerCategory,
  type NovuAppOAuthCatalogEntry,
} from './mcp-servers';

const MCP_SERVER_CATEGORIES: McpServerCategory[] = [
  'productivity',
  'communication',
  'code',
  'data',
  'sales-and-marketing',
  'financial-services',
  'design',
  'health-and-wellness',
  'other',
];

describe('MCP_SERVERS catalog', () => {
  describe('oauth field', () => {
    it("marks a known DCR entry with oauth.mode === 'dcr'", () => {
      const sentry = MCP_SERVERS.find((entry) => entry.id === 'sentry');

      expect(sentry).toBeDefined();
      expect(sentry?.oauth?.mode).toBe(McpConnectionAuthModeEnum.Dcr);
    });

    it('marks every catalog entry with an oauth mode (no "coming soon" rows)', () => {
      const missing = MCP_SERVERS.filter((entry) => !entry.oauth).map((entry) => entry.id);

      expect(missing).toEqual([]);
    });

    it('marks Slack as provider-managed (Claude owns the connector)', () => {
      const slack = MCP_SERVERS.find((entry) => entry.id === 'slack');

      expect(slack).toBeDefined();
      expect(slack?.oauth?.mode).toBe(McpConnectionAuthModeEnum.ProviderManaged);
    });

    it('covers every provider-managed MCP with a mode-only oauth entry', () => {
      const providerManaged = MCP_SERVERS.filter(
        (entry) => entry.oauth?.mode === McpConnectionAuthModeEnum.ProviderManaged
      );

      expect(providerManaged.length).toBeGreaterThan(0);

      for (const entry of providerManaged) {
        expect(entry.oauth).toEqual({ mode: McpConnectionAuthModeEnum.ProviderManaged });
      }
    });

    it('includes Claude vault delta MCPs that remain provider-managed', () => {
      const providerManagedDeltaIds = ['gmail', 'google-calendar', 'microsoft-365', 'vercel'];

      for (const id of providerManagedDeltaIds) {
        const entry = MCP_SERVERS.find((server) => server.id === id);

        expect(entry).toBeDefined();
        expect(entry?.oauth?.mode).toBe(McpConnectionAuthModeEnum.ProviderManaged);
      }
    });

    it('includes Claude vault delta MCPs migrated to dcr', () => {
      const dcrDeltaIds = ['miro', 'monday-com', 'zapier'];

      for (const id of dcrDeltaIds) {
        const entry = MCP_SERVERS.find((server) => server.id === id);

        expect(entry).toBeDefined();
        expect(entry?.oauth?.mode).toBe(McpConnectionAuthModeEnum.Dcr);
      }
    });

    it('uses unique catalog ids and urls', () => {
      const ids = MCP_SERVERS.map((entry) => entry.id);
      const urls = MCP_SERVERS.map((entry) => entry.url);

      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(urls).size).toBe(urls.length);
    });

    it('covers every DCR-verified MCP with a valid catalog shape', () => {
      const dcrEntries = MCP_SERVERS.filter((entry) => entry.oauth?.mode === McpConnectionAuthModeEnum.Dcr);

      expect(dcrEntries.length).toBeGreaterThan(0);

      for (const entry of dcrEntries) {
        expect(entry.name.trim().length, `${entry.id} name`).toBeGreaterThan(0);
        expect(MCP_SERVER_CATEGORIES, `${entry.id} category`).toContain(entry.category);

        const parsedUrl = new URL(entry.url);
        expect(parsedUrl.protocol, `${entry.id} url protocol`).toBe('https:');
        expect(parsedUrl.hostname.length, `${entry.id} url host`).toBeGreaterThan(0);
      }
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
          case McpConnectionAuthModeEnum.ProviderManaged:
            return entry.mode;
          default: {
            const _exhaustive: never = entry;

            return _exhaustive;
          }
        }
      }

      expect(assertExhaustive({ mode: McpConnectionAuthModeEnum.Dcr })).toBe('web');
      expect(assertExhaustive({ mode: McpConnectionAuthModeEnum.ProviderManaged })).toBe('provider-managed');
    });
  });
});
