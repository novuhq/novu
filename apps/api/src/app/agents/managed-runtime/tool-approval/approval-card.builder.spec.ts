import { expect } from 'chai';

import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import {
  buildToolApprovalCard,
  buildToolApprovalWhatsAppCard,
  getToolApprovalCard,
  TOOL_APPROVAL_ACTION_PREFIX,
} from './approval-card.builder';

const sampleTool = {
  toolUseId: 'toolu_01ABC',
  toolName: 'list_issues',
  mcpServerName: 'Linear',
  input: { me: true },
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
  describe('buildToolApprovalCard', () => {
    it('builds two action blocks with four buttons for non-WhatsApp platforms', () => {
      const card = buildToolApprovalCard(sampleTool);
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
    });
  });

  describe('buildToolApprovalWhatsAppCard', () => {
    it('builds a single action block with three WhatsApp-safe buttons', () => {
      const card = buildToolApprovalWhatsAppCard(sampleTool);
      const actionBlocks = getActionBlocks(card);
      const buttons = getButtons(card);

      expect(actionBlocks).to.have.length(1);
      expect(buttons).to.have.length(3);
      expect(buttons.map((button) => button.label)).to.deep.equal(['Deny', 'Approve once', 'Always allow tool']);
      expect(buttons.every((button) => (button.label?.length ?? 0) <= 20)).to.equal(true);
    });

    it('uses the tool-level persist action for the third button', () => {
      const card = buildToolApprovalWhatsAppCard(sampleTool);
      const buttons = getButtons(card);
      const persistButton = buttons[2];

      expect(persistButton.id).to.equal(
        `${TOOL_APPROVAL_ACTION_PREFIX}:approve-tool:toolu_01ABC:list_issues:Linear`
      );
    });
  });

  describe('getToolApprovalCard', () => {
    it('returns the WhatsApp card when platform is whatsapp', () => {
      const delivery = getToolApprovalCard({
        platform: AgentPlatformEnum.WHATSAPP,
        tool: sampleTool,
      });

      const actionBlocks = getActionBlocks(delivery.content.card as Record<string, unknown>);

      expect(actionBlocks).to.have.length(1);
      expect(getButtons(delivery.content.card as Record<string, unknown>)).to.have.length(3);
      expect(delivery.slackNative).to.equal(undefined);
    });

    it('returns the default card for Slack while attaching slackNative blocks', () => {
      const delivery = getToolApprovalCard({
        platform: AgentPlatformEnum.SLACK,
        tool: sampleTool,
      });

      const actionBlocks = getActionBlocks(delivery.content.card as Record<string, unknown>);

      expect(actionBlocks).to.have.length(2);
      expect(delivery.slackNative).to.not.equal(undefined);
    });
  });
});
