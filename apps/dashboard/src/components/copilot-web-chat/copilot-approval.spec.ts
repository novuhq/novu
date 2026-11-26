import type { AgentApprovalPart, AgentMessage } from '@novu/js';
import { describe, expect, it } from 'vitest';
import { describeCopilotChange, getApprovalIntegrationId } from './copilot-approval';
import { buildAssistantBlocks } from './copilot-web-chat-utils';

const INTEGRATION = { name: 'SendGrid', environmentName: 'Development' };

describe('describeCopilotChange', () => {
  it('says which way activity tracking turns, and for which integration', () => {
    expect(
      describeCopilotChange(
        { toolName: 'set_activity_tracking', input: { enabled: true, integrationId: 'a' } },
        INTEGRATION
      )
    ).toBe('Turn on activity tracking for "SendGrid" in Development');
    expect(describeCopilotChange({ toolName: 'set_activity_tracking', input: { enabled: false } })).toBe(
      'Turn off activity tracking for this integration'
    );
  });

  it('names the integration that becomes primary', () => {
    expect(describeCopilotChange({ toolName: 'set_primary_integration', input: {} }, { name: 'Twilio' })).toBe(
      'Make "Twilio" the primary integration of its channel'
    );
  });

  it('lists what an update changes and skips the arguments the Copilot left empty', () => {
    expect(
      describeCopilotChange(
        { toolName: 'update_integration', input: { name: 'Mail', identifier: null, active: false } },
        INTEGRATION
      )
    ).toBe('Update "SendGrid" in Development: rename it to "Mail", turn it off');
  });

  it('matches a tool name the MCP server namespaced', () => {
    expect(describeCopilotChange({ toolName: 'novu__set_primary_integration' }, INTEGRATION)).toBe(
      'Make "SendGrid" in Development the primary integration of its channel'
    );
  });

  it('falls back to the tool name for a tool it does not know', () => {
    expect(describeCopilotChange({ toolName: 'delete_everything' })).toBe('Run delete everything');
  });
});

describe('getApprovalIntegrationId', () => {
  it('reads the id the change targets, and nothing else', () => {
    expect(getApprovalIntegrationId({ input: { integrationId: 'abc' } })).toBe('abc');
    expect(getApprovalIntegrationId({ input: { integrationId: 5 } })).toBeUndefined();
    expect(getApprovalIntegrationId({})).toBeUndefined();
  });
});

describe('buildAssistantBlocks (approval)', () => {
  it('shows a change waiting for approval as its own block', () => {
    const part: AgentApprovalPart = {
      type: 'approval',
      approvalId: 'approval_1',
      toolUseId: 'call_1',
      toolName: 'set_activity_tracking',
      input: { enabled: true, integrationId: 'a' },
      state: 'pending',
      approveActionId: 'tool-approval:approve:approval_1',
      denyActionId: 'tool-approval:deny:approval_1',
    };
    const message: AgentMessage = {
      id: 'act_1',
      role: 'assistant',
      parts: [part],
      createdAt: '2026-11-26T00:00:00.000Z',
      status: 'sent',
    };

    expect(buildAssistantBlocks(message)).toEqual([{ kind: 'approval', key: 'act_1:0', part }]);
  });
});
