const CONVERSATION_ID = 'conv_abc123';
const INTEGRATION_IDENTIFIER = 'slack-prod';

export const AGENT_REPLY_BODY_EXAMPLES = {
  markdownReply: {
    summary: 'Markdown reply',
    description: 'Send a plain markdown message into the conversation thread.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      reply: {
        markdown: '**Report generated.** See the attached PDF.',
      },
    },
  },
  filesReply: {
    summary: 'Markdown reply with file attachments',
    description: 'Attach one or more files via public URL alongside markdown content.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      reply: {
        markdown: 'Here is your report.',
        files: [
          {
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            url: 'https://cdn.example.com/report.pdf',
          },
        ],
      },
    },
  },
  cardReply: {
    summary: 'Interactive card reply',
    description: 'Send a structured card with text and action buttons.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      reply: {
        card: {
          type: 'card',
          title: 'Deploy status',
          subtitle: 'Production',
          children: [
            { type: 'text', content: 'The latest deploy succeeded.' },
            {
              type: 'button',
              id: 'view-logs',
              label: 'View logs',
              style: 'primary',
            },
          ],
        },
      },
    },
  },
  editMessage: {
    summary: 'Edit a sent message',
    description: 'Replace the content of a previously posted platform message.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      edit: {
        messageId: 'msg_01HXYZ',
        content: {
          markdown: 'Updated answer after review.',
        },
      },
    },
  },
  addReactions: {
    summary: 'Add emoji reactions',
    description: 'React to one or more platform messages without posting a new message.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      addReactions: [
        { messageId: 'msg_01HXYZ', emojiName: 'thumbs_up' },
        { messageId: 'msg_01HABC', emojiName: 'check' },
      ],
    },
  },
  deleteMessages: {
    summary: 'Delete platform messages',
    description: 'Remove rendered messages from the provider thread while preserving conversation history.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      deleteMessages: [{ messageId: 'msg_01HXYZ' }, { messageId: 'msg_01HABC' }],
    },
  },
  typingStatus: {
    summary: 'Set typing status',
    description: 'Show a custom status while the agent processes the turn.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      typing: { status: 'Searching the docs…' },
    },
  },
  typingStop: {
    summary: 'Clear typing status',
    description: 'Stop the typing indicator without sending a message.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      typing: 'stop',
    },
  },
  resolveConversation: {
    summary: 'Resolve conversation',
    description: 'Mark the conversation resolved with an optional summary.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      resolve: { summary: 'Issue resolved — billing adjustment applied.' },
    },
  },
  metadataSignal: {
    summary: 'Metadata signal',
    description: 'Persist key-value metadata on the conversation without messaging the user.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      signals: [{ type: 'metadata', action: 'set', key: 'sentiment', value: 'positive' }],
    },
  },
  triggerSignal: {
    summary: 'Trigger workflow signal',
    description: 'Fire a Novu workflow from the agent turn.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      signals: [
        {
          type: 'trigger',
          workflowId: 'escalation-email',
          to: 'subscriber-123',
          payload: { reason: 'User requested human support' },
        },
      ],
    },
  },
  toolResults: {
    summary: 'Report tool results',
    description: 'Record tool execution output in the conversation history.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      toolResults: [
        {
          toolCallId: 'tc_456',
          toolName: 'search_database',
          output: { rows: 3 },
          preview: 'Found 3 matching rows',
        },
      ],
    },
  },
  toolApproval: {
    summary: 'Request tool approval',
    description: 'Post a tool-approval card and register the pending approval in the conversation ledger.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      toolApprovalRequest: {
        approvalId: 'appr_123',
        toolCallId: 'tc_456',
        name: 'search_database',
        input: { query: 'SELECT * FROM users WHERE id = 42' },
      },
      reply: {
        toolApprovalCard: {
          type: 'tool-approval-card',
          title: 'Approve database search?',
          subtitle: 'search_database',
          body: 'Query: `SELECT * FROM users WHERE id = 42`',
        },
      },
    },
  },
  errorReport: {
    summary: 'Report turn error',
    description: 'Deliver generic user-facing copy when the agent runtime fails. Cannot be combined with other fields.',
    value: {
      conversationId: CONVERSATION_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      error: true,
    },
  },
} as const;
