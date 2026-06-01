import { McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { findOAuthMcpByServerName, isOAuthMcpPending, isProviderManagedOAuthMcp } from './oauth-mcp.types';
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

  describe('findOAuthMcpByServerName', () => {
    it('matches by catalog display name', () => {
      const mcps = [
        {
          mcpId: 'slack',
          name: 'Slack',
          agentMcpServerId: 'en-1',
        },
      ];

      expect(findOAuthMcpByServerName(mcps, 'Slack')?.mcpId).to.equal('slack');
    });

    it('matches by mcpId case-insensitively', () => {
      const mcps = [
        {
          mcpId: 'linear',
          name: 'Linear',
          agentMcpServerId: 'en-2',
        },
      ];

      expect(findOAuthMcpByServerName(mcps, 'LINEAR')?.mcpId).to.equal('linear');
    });
  });

  describe('isOAuthMcpPending', () => {
    it('treats provider-managed MCPs without a connection as pending', () => {
      expect(
        isOAuthMcpPending({
          mcpId: 'slack',
          name: 'Slack',
          agentMcpServerId: 'en-1',
          defaultAuthMode: McpConnectionAuthModeEnum.ProviderManaged,
        })
      ).to.equal(true);
    });

    it('treats provider-managed MCPs with status connected as not pending', () => {
      expect(
        isOAuthMcpPending({
          mcpId: 'slack',
          name: 'Slack',
          agentMcpServerId: 'en-1',
          defaultAuthMode: McpConnectionAuthModeEnum.ProviderManaged,
          status: McpConnectionStatusEnum.Connected,
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
    it('omits connected MCPs from the pending setup card', () => {
      const card = buildSetupCard({
        mcps: [
          {
            mcpId: 'figma',
            name: 'Figma',
            agentMcpServerId: 'en-1',
            status: McpConnectionStatusEnum.Connected,
          },
        ],
      });

      const children = card.children as Array<{ type: string; content?: string }>;
      const figmaRow = children.find((block) => block.type === 'text' && block.content?.includes('Figma'));

      expect(figmaRow).to.equal(undefined);
    });

    it('renders a "Connect from provider" button when connectButtonLabel is set', () => {
      const card = buildSetupCard({
        mcps: [
          {
            mcpId: 'slack',
            name: 'Slack',
            agentMcpServerId: 'en-1',
            authorizeUrl: 'https://platform.claude.com/workspaces/ws_1/vaults/vlt_1',
            connectButtonLabel: 'Connect from provider',
          },
        ],
      });

      const children = card.children as Array<{
        type: string;
        children?: Array<{ type: string; label?: string; url?: string }>;
      }>;
      const actions = children.find((block) => block.type === 'actions');
      const linkButton = actions?.children?.find((child) => child.type === 'link-button');

      expect(linkButton?.label).to.equal('Connect from provider');
      expect(linkButton?.url).to.equal('https://platform.claude.com/workspaces/ws_1/vaults/vlt_1');
    });

    it('falls back to the default "Connect" label for DCR MCPs', () => {
      const card = buildSetupCard({
        mcps: [
          {
            mcpId: 'linear',
            name: 'Linear',
            agentMcpServerId: 'en-2',
            authorizeUrl: 'https://example.com/oauth/authorize',
          },
        ],
      });

      const children = card.children as Array<{
        type: string;
        children?: Array<{ type: string; label?: string }>;
      }>;
      const actions = children.find((block) => block.type === 'actions');
      const linkButton = actions?.children?.find((child) => child.type === 'link-button');

      expect(linkButton?.label).to.equal('Connect');
    });

    it('renders the Connect button on a connected MCP that needs to be re-authorized', () => {
      const card = buildSetupCard({
        mcps: [
          {
            mcpId: 'slack',
            name: 'Slack',
            agentMcpServerId: 'en-1',
            status: McpConnectionStatusEnum.Connected,
            authorizeUrl: 'https://platform.claude.com/workspaces/ws_1/vaults/vlt_1',
            connectButtonLabel: 'Connect from provider',
          },
        ],
      });

      const children = card.children as Array<{
        type: string;
        content?: string;
        children?: Array<{ type: string; label?: string; url?: string }>;
      }>;
      const slackRow = children.find((block) => block.type === 'text' && block.content?.includes('Slack'));
      const actions = children.find((block) => block.type === 'actions');
      const linkButton = actions?.children?.find((child) => child.type === 'link-button');

      expect(slackRow?.content).to.equal('**Slack**');
      expect(linkButton?.label).to.equal('Connect from provider');
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
