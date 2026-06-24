import { expect } from 'chai';

import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { getToolApprovalCard } from './approval-card.builder';

const MCP_TOOL_APPROVAL_ACTION_PREFIX = 'mcp-approval';
const DIRECT_TOOL_APPROVAL_ACTION_PREFIX = 'direct-approval';

const mcpTool = {
  toolUseId: 'toolu_01ABC',
  toolName: 'list_issues',
  mcpServerName: 'Linear',
  input: { me: true },
};

const directTool = {
  toolUseId: 'toolu_02DEF',
  toolName: 'send_email',
  input: { to: 'user@example.com' },
};

function getActionBlocks(card: Record<string, unknown>) {
  const children = card.children as Array<{ type: string; children?: Array<{ type: string; label?: string; id?: string }> }>;

  return children.filter((child) => child.type === 'actions');
}

function getButtons(card: Record<string, unknown>) {
  const actionBlocks = getActionBlocks(card);

  return actionBlocks.flatMap((block) => block.children?.filter((child) => child.type === 'button') ?? []);
}

describe('approval-card.builder', () => {
  describe('getToolApprovalCard — MCP tools', () => {
    it('builds two action blocks with four buttons for non-WhatsApp platforms', () => {
      const delivery = getToolApprovalCard({
        platform: AgentPlatformEnum.SLACK,
        tool: mcpTool,
      });
      const card = delivery.content.card as Record<string, unknown>;
      const actionBlocks = getActionBlocks(card);
      const buttons = getButtons(card);

      expect(actionBlocks).to.have.length(2);
      expect(buttons).to.have.length(4);
      expect(buttons.map((button) => button.label)).to.deep.equal([
        'Deny',
        'Approve once',
        'Always allow this tool',
        'Always allow Linear',
      ]);
      expect(delivery.slackNative).to.not.equal(undefined);
    });

    it('builds a single action block with three WhatsApp-safe buttons', () => {
      const delivery = getToolApprovalCard({
        platform: AgentPlatformEnum.WHATSAPP,
        tool: mcpTool,
      });
      const card = delivery.content.card as Record<string, unknown>;
      const actionBlocks = getActionBlocks(card);
      const buttons = getButtons(card);

      expect(actionBlocks).to.have.length(1);
      expect(buttons).to.have.length(3);
      expect(buttons.map((button) => button.label)).to.deep.equal(['Deny', 'Approve once', 'Always allow tool']);
      expect(buttons.every((button) => (button.label?.length ?? 0) <= 20)).to.equal(true);
      expect(buttons[2]?.id).to.equal(
        `${MCP_TOOL_APPROVAL_ACTION_PREFIX}:approve-tool:toolu_01ABC:list_issues:Linear`
      );
      expect(delivery.slackNative).to.equal(undefined);
    });
  });

  describe('getToolApprovalCard — direct tools', () => {
    it('builds two action blocks for non-WhatsApp platforms', () => {
      const delivery = getToolApprovalCard({
        platform: AgentPlatformEnum.TELEGRAM,
        tool: directTool,
      });
      const card = delivery.content.card as Record<string, unknown>;

      expect(getActionBlocks(card)).to.have.length(2);
      expect(getButtons(card)).to.have.length(3);
    });

    it('builds a single action block with three WhatsApp-safe buttons', () => {
      const delivery = getToolApprovalCard({
        platform: AgentPlatformEnum.WHATSAPP,
        tool: directTool,
      });
      const card = delivery.content.card as Record<string, unknown>;
      const buttons = getButtons(card);

      expect(getActionBlocks(card)).to.have.length(1);
      expect(buttons).to.have.length(3);
      expect(buttons[2]?.id).to.equal(
        `${DIRECT_TOOL_APPROVAL_ACTION_PREFIX}:approve-tool:toolu_02DEF:send_email`
      );
    });
  });
});
