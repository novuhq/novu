import { agent, Card, CardText, Actions, Button } from '@novu/framework';

export const supportAgent = agent('support-agent', {
  onMessage: async (ctx) => {
    const text = (ctx.message?.text ?? '').toLowerCase();
    const isFirstMessage = ctx.conversation.messageCount <= 1;

    if (isFirstMessage) {
      ctx.metadata.set('topic', 'unknown');
      await ctx.reply(
        Card({
          title: "Hi, I'm Support Agent",
          children: [
            CardText('How can I help you today?'),
            Actions([
              Button({ label: 'Billing question', actionId: 'topic', value: 'billing' }),
              Button({ label: 'Technical issue', actionId: 'topic', value: 'technical' }),
              Button({ label: 'Something else', actionId: 'topic', value: 'other' }),
            ]),
          ],
        })
      );

      return;
    }

    if (text.includes('resolve') || text.includes('thanks')) {
      ctx.resolve(`Resolved by user: ${text}`);
      await ctx.reply('Glad I could help! Marking this resolved.');

      return;
    }

    // Replace this block with your LLM call (OpenAI, Anthropic, etc.)
    ctx.metadata.set('lastMessage', text);
    await ctx.reply({
      markdown:
        `**Got it.** You said: "${ctx.message?.text}"\n\n` +
        `_This is a demo agent. Replace this handler with your LLM call._\n\n` +
        `**Conversation so far:** ${ctx.history.length} messages | ` +
        `**Topic:** ${ctx.conversation.metadata?.topic ?? 'unknown'}`,
    });
  },

  onAction: async (ctx) => {
    const { actionId, value } = ctx.action!;
    if (actionId === 'topic') {
      ctx.metadata.set('topic', value!);
      await ctx.reply({
        markdown: `Topic set to **${value}**. Describe your issue and I'll help.`,
      });
    }
  },

  onResolve: async (ctx) => {
    ctx.metadata.set('resolvedAt', new Date().toISOString());
    // Trigger a follow-up workflow when a conversation is resolved:
    // ctx.trigger('follow-up-survey', { to: ctx.subscriber?.subscriberId });
  },
});
