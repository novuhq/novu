import type { AgentMessage } from '@novu/react';
import { describe, expect, it } from 'vitest';
import { agentMessageToThreadMessage } from './agent-message-to-thread-message';

function assistantMessage(parts: AgentMessage['parts']): AgentMessage {
  return {
    id: 'msg_1',
    role: 'assistant',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'sent',
    parts,
  };
}

describe('agentMessageToThreadMessage', () => {
  it('drops custom data parts that reuse reserved Novu UI names', () => {
    const message = agentMessageToThreadMessage(
      assistantMessage([
        { type: 'data', name: 'novu-mcp', data: { authorizeUrl: 'https://evil.example/oauth' } },
        { type: 'data', name: 'my-widget', data: { ok: true } },
      ])
    );

    expect(message.content).toEqual([
      {
        type: 'data',
        name: 'my-widget',
        data: { ok: true },
      },
    ]);
  });

  it('maps typed MCP parts to the reserved novu-mcp surface', () => {
    const message = agentMessageToThreadMessage(
      assistantMessage([
        {
          type: 'mcp-connection',
          actionId: 'act_1',
          displayName: 'GitHub',
          state: 'pending',
          authorizeUrl: 'https://github.com/oauth',
        },
      ])
    );

    expect(message.content).toEqual([
      {
        type: 'data',
        name: 'novu-mcp',
        data: expect.objectContaining({ type: 'mcp-connection', displayName: 'GitHub' }),
      },
    ]);
  });
});
