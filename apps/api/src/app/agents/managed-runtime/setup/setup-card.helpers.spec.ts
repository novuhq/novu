import { McpConnectionAuthModeEnum } from '@novu/shared';
import { expect } from 'chai';
import { isOAuthMcpPending, isProviderManagedOAuthMcp } from './oauth-mcp.types';
import { buildSetupCard } from './setup-card.helpers';

describe('setup-card helpers', () => {
  describe('isProviderManagedOAuthMcp', () => {
    it('returns true when defaultAuthMode is provider-managed', () => {
      expect(
        isProviderManagedOAuthMcp({
          mcpId: 'slack',
          name: 'Slack',
          agentMcpServerId: 'en-1',
          defaultAuthMode: McpConnectionAuthModeEnum.ProviderManaged,
        })
      ).to.equal(true);
    });

    it('falls back to catalog oauth mode by mcpId', () => {
      expect(
        isProviderManagedOAuthMcp({
          mcpId: 'figma',
          name: 'Figma',
          agentMcpServerId: 'en-2',
        })
      ).to.equal(true);
    });
  });

  describe('isOAuthMcpPending', () => {
    it('treats provider-managed MCPs as not pending', () => {
      expect(
        isOAuthMcpPending({
          mcpId: 'slack',
          name: 'Slack',
          agentMcpServerId: 'en-1',
          defaultAuthMode: McpConnectionAuthModeEnum.ProviderManaged,
        })
      ).to.equal(false);
    });

    it('treats DCR MCPs without a connection as pending', () => {
      expect(
        isOAuthMcpPending({
          mcpId: 'linear',
          name: 'Linear',
          agentMcpServerId: 'en-2',
          defaultAuthMode: McpConnectionAuthModeEnum.Dcr,
        })
      ).to.equal(true);
    });
  });

  describe('buildSetupCard', () => {
    it('renders provider-managed rows with a checkmark when treatAsConnected is set', () => {
      const card = buildSetupCard({
        mcps: [
          {
            mcpId: 'figma',
            name: 'Figma',
            agentMcpServerId: 'en-1',
            treatAsConnected: true,
          },
        ],
      });

      const children = card.children as Array<{ type: string; content?: string }>;
      const figmaRow = children.find((block) => block.type === 'text' && block.content?.includes('Figma'));

      expect(figmaRow?.content).to.equal('**Figma**  ✅');
    });

    it('renders pending DCR rows without a checkmark when authorizeUrl is absent', () => {
      const card = buildSetupCard({
        mcps: [
          {
            mcpId: 'linear',
            name: 'Linear',
            agentMcpServerId: 'en-2',
          },
        ],
      });

      const children = card.children as Array<{ type: string; content?: string }>;
      const linearRow = children.find((block) => block.type === 'text' && block.content?.includes('Linear'));

      expect(linearRow?.content).to.equal('**Linear**');
    });
  });
});
