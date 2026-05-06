/** @jsxImportSource @novu/framework */
import { Actions, agent, Button, Card, CardText } from '@novu/framework';

/**
 * Novu calls these handlers whenever a user sends a message or clicks an action
 * in a connected channel (Slack, Teams, in-app, etc.).
 */
export const supportAgent = agent('support-agent', {
  onMessage: async ({ message, ctx }) => {
    const firstName = ctx.subscriber?.firstName;
    const text = (message.text ?? '').toLowerCase();

    // messageCount starts at 1 for the first message in a thread
    const isFirstMessage = ctx.conversation.messageCount <= 1;

    if (isFirstMessage) {
      ctx.metadata.set('topic', 'unknown'); // stores a key/value on the conversation

      return (
        <Card title={`Hi${firstName ? `, ${firstName}` : ''}! I'm Support Agent`}>
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
      ctx.resolve(`Resolved by user: ${text}`); // marks the conversation as resolved
      // ctx.trigger('follow-up-survey', { to: ctx.subscriber }); // optionally fire a workflow

      return 'Glad I could help! Marking this resolved.';
    }

    // Replace with your LLM call. ctx.history is AgentHistoryEntry[] — map to your model's format:
    //   const messages = ctx.history.map(h => ({ role: h.role, content: h.content }));
    ctx.metadata.set('lastMessage', text);

    return (
      `**Got it.** You said: "${message.text}"\n\n` +
      `_This is a demo agent. Replace this handler with your LLM call._\n\n` +
      `**Conversation so far:** ${ctx.history.length} messages | ` +
      `**Topic:** ${ctx.metadata.get('topic') ?? 'unknown'}`
    );
  },

  // Return a string or card to reply; return nothing to silently acknowledge the click
  onAction: async ({ actionId, value, ctx }) => {
    if (actionId.startsWith('topic-') && value) {
      ctx.metadata.set('topic', value);

      return `Topic set to **${value}**. Describe your issue and I'll help.`;
    }
  },
});
