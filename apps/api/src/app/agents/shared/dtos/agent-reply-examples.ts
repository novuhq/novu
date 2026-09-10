/**
 * Named OpenAPI / Speakeasy request-body examples for POST /v1/agents/{agentId}/reply.
 * Keep values aligned with the live reply contract and Mintlify docs.
 */
export const AGENT_REPLY_BODY_EXAMPLES = {
  markdownReply: {
    summary: 'Markdown reply',
    description: 'Send a markdown (or plain text) message into an existing conversation.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      reply: {
        markdown: '**Report ready.** Your weekly summary is attached.',
      },
    },
  },
  replyWithFile: {
    summary: 'Reply with file attachment',
    description:
      'Attach files to a markdown reply. Provide exactly one of `url` or `data` per file. Prefer `url` for larger files.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      reply: {
        markdown: 'Here is your report.',
        files: [
          {
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            url: 'https://example.com/files/report.pdf',
          },
        ],
      },
    },
  },
  cardReply: {
    summary: 'Interactive card reply',
    description:
      'Send a Chat SDK card (buttons, text, links). Build cards with `@novu/framework` helpers or an equivalent JSON tree.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      reply: {
        card: {
          type: 'card',
          title: 'Order #123',
          children: [
            { type: 'text', content: 'Your order is ready for pickup.' },
            { type: 'button', id: 'confirm', label: 'Confirm', style: 'primary' },
          ],
        },
      },
    },
  },
  editMessage: {
    summary: 'Edit a sent message',
    description:
      'Update a previously delivered agent message in place. Cannot be combined with resolve, signals, or reactions.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      edit: {
        messageId: '1712345678.123456',
        content: { markdown: 'Updated: the report is now final.' },
      },
    },
  },
  typingStart: {
    summary: 'Start typing indicator',
    description: 'Best-effort status text on platforms that support it. Omit `status` for the default "Thinking…".',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      typing: { status: 'Looking up your order…' },
    },
  },
  typingStop: {
    summary: 'Stop typing indicator',
    description: 'Clear the typing / status indicator for this turn.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      typing: 'stop',
    },
  },
  addReaction: {
    summary: 'Add emoji reaction',
    description: 'React to a platform message with a well-known emoji name.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      addReactions: [{ messageId: '1712345678.123456', emojiName: 'white_check_mark' }],
    },
  },
  deleteMessage: {
    summary: 'Delete a sent message',
    description: 'Remove a previously posted platform message. Conversation history is preserved.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      deleteMessages: [{ messageId: '1712345678.123456' }],
    },
  },
  resolveConversation: {
    summary: 'Resolve conversation',
    description:
      'Mark the conversation resolved. Optionally include a summary and/or a final reply in the same request.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      reply: { markdown: 'Glad that helped — marking this as resolved.' },
      resolve: { summary: 'Answered billing question about invoice INV-42.' },
    },
  },
  metadataSignal: {
    summary: 'Set conversation metadata',
    description:
      'Persist key/value metadata on the conversation for later turns. Keys: 1–128 chars, letters/digits with `-`, `_`, `:` separators.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      signals: [{ type: 'metadata', action: 'set', key: 'crm:ticketId', value: 'TCK-1001' }],
    },
  },
  humanApprove: {
    summary: 'Ask the conversation subscriber to approve',
    description:
      'Create an approve/deny card in the current conversation thread. The verdict arrives later on `onAction` with `ctx.humanResponse`.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      signals: [
        {
          type: 'human',
          kind: 'approve',
          card: { title: 'Deploy v2.4.1 to production?' },
          requestId: 'hr_7c2e1a3b-4d5f-6789-abcd-ef0123456789',
        },
      ],
    },
  },
  triggerWorkflow: {
    summary: 'Trigger a Novu workflow',
    description:
      'Fire a workflow from the agent turn. When `to` is omitted, Novu uses the conversation subscriber if one is resolved.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      signals: [
        {
          type: 'trigger',
          workflowId: 'order-shipped',
          to: 'subscriber-123',
          payload: { orderId: 'ORD-42' },
        },
      ],
    },
  },
  toolResult: {
    summary: 'Report tool results',
    description: 'Persist tool-call outcomes into conversation history (typically before the assistant reply).',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      toolResults: [
        {
          toolCallId: 'call_abc123',
          toolName: 'lookup_order',
          output: { status: 'shipped', eta: '2026-07-16' },
          preview: 'Order ORD-42 is shipped',
        },
      ],
      reply: { markdown: 'Your order **ORD-42** has shipped and should arrive by July 16.' },
    },
  },
  toolApprovalRequest: {
    summary: 'Request tool approval',
    description:
      'Ledger a gated tool call and optionally deliver an approval card via `reply.toolApprovalCard` or a normal card/markdown reply.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      toolApprovalRequest: {
        approvalId: 'apr_01HZX',
        toolCallId: 'call_refund_1',
        name: 'issue_refund',
        input: { orderId: 'ORD-42', amountCents: 2500 },
      },
      reply: {
        toolApprovalCard: {
          type: 'tool-approval-card',
          title: 'Approve refund?',
          subtitle: 'issue_refund · ORD-42 · $25.00',
          approveLabel: 'Approve',
          denyLabel: 'Deny',
        },
      },
    },
  },
  turnError: {
    summary: 'Report turn failure',
    description:
      'Bridge reports that the customer runtime failed. Cannot be combined with other actions. Novu delivers generic user-facing copy.',
    value: {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      error: true,
    },
  },
} as const;
