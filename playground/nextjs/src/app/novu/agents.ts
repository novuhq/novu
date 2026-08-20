import { tool } from '@langchain/core/tools';
import { Actions, type AgentMessageContext, Button, Card, CardText } from '@novu/framework';
import { agent } from '@novu/framework/langchain';
import { z } from 'zod';

const lookupOrder = tool(async ({ orderId }) => ({ orderId, status: 'shipped', carrier: 'Novu Dummy Freight' }), {
  name: 'lookupOrder',
  description: 'Look up a dummy order by ID. Always returns shipped.',
  schema: z.object({
    orderId: z.string().describe('The order ID to look up'),
  }),
});

const USAGE_LIMIT_APPROVAL_REQUESTED_KEY = 'usageLimitApprovalRequested';

function findUsageLimitNotice(ctx: AgentMessageContext): string | undefined {
  return ctx.history.find((entry) => (entry.content ?? '').toLowerCase().includes('lets increase'))?.content;
}

function requestUsageLimitApproval(ctx: AgentMessageContext, notice: string) {
  ctx.metadata.set(USAGE_LIMIT_APPROVAL_REQUESTED_KEY, true);
  ctx.approve({
    to: '236df743-a484-415a-8c58-b227412816c0',
    payload: {
      action: `Raise the usage limit?\n\n${notice}`,
      from: 'novu-agent',
      ttl: '1m',
    },
  });
}

/**
 * Dummy `@novu/framework/langchain` agent for the playground bridge.
 *
 * On a `usage-limit` thread, the first admin reply triggers the `novu-approve` workflow.
 * Otherwise: first message posts a card; later turns return a LangChainAgentConfig
 * so Novu runs the model. Without OPENAI_API_KEY it echoes instead.
 */
export const novuAgent = agent('novu-agent', {
  onMessage: async (message, ctx) => {
    console.log('onMessage called!');
    console.dir({ ctx }, { depth: null });
    console.dir({ message }, { depth: null });

    const usageLimitNotice = findUsageLimitNotice(ctx);
    if (usageLimitNotice && !ctx.metadata.get(USAGE_LIMIT_APPROVAL_REQUESTED_KEY)) {
      console.log('Sending approval request for usage limit notice!');
      console.dir({ usageLimitNotice }, { depth: null });

      requestUsageLimitApproval(ctx, usageLimitNotice);

      return "Opened an approval request to raise this org's usage limit. Use the Approve/Deny buttons in the next message.";
    }

    const firstName = ctx.subscriber?.firstName;
    const text = (message.text ?? '').toLowerCase();
    const isFirstMessage = ctx.conversation.messageCount <= 1;

    if (isFirstMessage) {
      ctx.metadata.set('topic', 'unknown');

      return Card({
        title: `Hi${firstName ? `, ${firstName}` : ''}! I'm a dummy LangChain agent`,
        children: [
          CardText('Ask about an order, or pick a topic below.'),
          Actions([
            Button({ id: 'topic-billing', label: 'Billing question', value: 'billing' }),
            Button({ id: 'topic-technical', label: 'Technical issue', value: 'technical' }),
            Button({ id: 'topic-other', label: 'Something else', value: 'other' }),
          ]),
        ],
      });
    }

    if (text.includes('resolve') || text.includes('thanks')) {
      ctx.resolve(`Resolved by user: ${text}`);

      return 'Glad I could help! Marking this resolved.';
    }

    ctx.metadata.set('lastMessage', text);

    if (!process.env.OPENAI_API_KEY) {
      return (
        `**Got it.** You said: "${message.text}"\n\n` +
        `_Dummy LangChain agent — set OPENAI_API_KEY to let Novu run the model._\n\n` +
        `**Conversation so far:** ${ctx.history.length} messages | ` +
        `**Topic:** ${ctx.metadata.get('topic') ?? 'unknown'}`
      );
    }

    return {
      model: 'openai:gpt-4o-mini',
      system:
        'You are a helpful playground agent. Use lookupOrder when the user asks about an order. Keep answers short.',
      tools: [lookupOrder],
      needsApproval: (toolCall) => toolCall.name === 'lookupOrder',
    };
  },

  onAction: async (action, ctx) => {
    console.log('onAction called!');
    console.dir({ action }, { depth: null });
    console.dir({ ctx }, { depth: null });

    return `Action received! ${action.id} ${action.value}`;
  },
});
