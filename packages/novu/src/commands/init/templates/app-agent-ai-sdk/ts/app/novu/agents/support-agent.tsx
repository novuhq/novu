/** @jsxImportSource @novu/framework */
import { Actions, Button, Card, CardText } from '@novu/framework';
import { agent } from '@novu/framework/ai-sdk';
import { tool } from 'ai';

import { searchNovuDocsIndex, searchNovuDocsInputSchema } from './tools/search-novu-docs';

const searchNovuDocs = tool({
  description: 'Search Novu documentation for relevant guides.',
  inputSchema: searchNovuDocsInputSchema,
  needsApproval: true,
  execute: async ({ query }) => ({ matches: await searchNovuDocsIndex(query) }),
});

// Wire your LLM — install a provider, then uncomment the imports and return below:
//   npm install @ai-sdk/openai        # OpenAI
//   npm install @ai-sdk/anthropic     # Anthropic
//   npm install @ai-sdk/google        # Google
//
// import { generateText } from 'ai';
// import { openai } from '@ai-sdk/openai';
// import { toModelMessages } from '@novu/framework/ai-sdk';

/**
 * Novu calls these handlers whenever a user sends a message or clicks an action
 * in a connected channel (Slack, Teams, in-app, etc.).
 */
export const supportAgent = agent('support-agent', {
  onMessage: async (message, ctx) => {
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

    ctx.metadata.set('lastMessage', text);

    return (
      `**Got it.** You said: "${message.text}"\n\n` +
      `_This is a demo agent. Uncomment the generateText return below to wire your LLM._\n` +
      `_Once wired, try "how does tool approval work in Novu?" to see the approval flow._\n\n` +
      `**Conversation so far:** ${ctx.history.length} messages | ` +
      `**Topic:** ${ctx.metadata.get('topic') ?? 'unknown'}`
    );

    // return generateText({
    //   model: openai('gpt-4o-mini'),
    //   instructions: 'You are a helpful support agent. Use searchNovuDocs to find Novu documentation.',
    //   messages: toModelMessages(ctx.history),
    //   tools: { searchNovuDocs },
    // });
  },

  // Return a string or card to reply; return nothing to silently acknowledge the click
  onAction: async (action, ctx) => {
    if (action.id.startsWith('topic-') && action.value) {
      ctx.metadata.set('topic', action.value);

      return `Topic set to **${action.value}**. Describe your issue and I'll help.`;
    }
  },
});
