/** @jsxImportSource @novu/framework */
import { Actions, agent, Button, Card, CardText } from '@novu/framework';

export const supportAgent = agent('support-agent', {
  onMessage: async (ctx) => {
    const text = (ctx.message?.text ?? '').toLowerCase();
    const isFirstMessage = ctx.conversation.messageCount <= 1;

    if (isFirstMessage) {
      ctx.metadata.set('topic', 'unknown');

      return (
        <Card title="Hi, I'm Support Agent">
          <CardText>How can I help you today?</CardText>
          <Actions>
            <Button id="topic-billing" label="Billing question" value="billing" />
            <Button id="topic-technical" label="Technical issue" value="technical" />
            <Button id="topic-other" label="Something else" value="other" />
          </Actions>
        </Card>
      );
    }

    if (text.includes('resolve') || text.includes('thanks')) {
      ctx.resolve(`Resolved by user: ${text}`);

      return 'Glad I could help! Marking this resolved.';
    }

    // Replace this block with your LLM call (OpenAI, Anthropic, etc.)
    ctx.metadata.set('lastMessage', text);

    return (
      `**Got it.** You said: "${ctx.message?.text}"\n\n` +
      `_This is a demo agent. Replace this handler with your LLM call._\n\n` +
      `**Conversation so far:** ${ctx.history.length} messages | ` +
      `**Topic:** ${ctx.conversation.metadata?.topic ?? 'unknown'}`
    );
  },

  onAction: async (ctx) => {
    const { actionId, value } = ctx.action!;
    if (actionId.startsWith('topic-') && value) {
      ctx.metadata.set('topic', value);

      return `Topic set to **${value}**. Describe your issue and I'll help.`;
    }
  },

  onResolve: async (ctx) => {
    ctx.metadata.set('resolvedAt', new Date().toISOString());
    // Trigger a follow-up workflow when a conversation is resolved:
    // ctx.trigger('follow-up-survey', { to: ctx.subscriber?.subscriberId });
  },
});
