/** @jsxImportSource @novu/framework */

import { tool } from '@langchain/core/tools';
import { Actions, Button, Card, CardText } from '@novu/framework';
import { agent } from '@novu/framework/langchain';

import { searchNovuDocsIndex, searchNovuDocsInputSchema } from './tools/search-novu-docs';

// Example tool — gates external fetches behind user approval (needsApproval callback below).
const searchNovuDocs = tool(async ({ query }) => ({ matches: await searchNovuDocsIndex(query) }), {
  name: 'searchNovuDocs',
  description: 'Search Novu documentation for relevant guides.',
  schema: searchNovuDocsInputSchema,
});

// Wire your LLM — install a provider, then uncomment the return below:
//   npm install @langchain/openai        # OpenAI
//   npm install @langchain/anthropic     # Anthropic
//   npm install @langchain/google-genai  # Google
//
// Returning { model, system, tools } lets Novu run the agent and own the
// tool-approval loop — no LangGraph checkpointer required.

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
      `_This is a demo agent. Uncomment the LangChain config return below to wire your LLM._\n` +
      `_Once wired, try "how does tool approval work in Novu?" to see the approval flow._\n\n` +
      `**Conversation so far:** ${ctx.history.length} messages | ` +
      `**Topic:** ${ctx.metadata.get('topic') ?? 'unknown'}`
    );

    // return {
    //   model: 'openai:gpt-4o-mini',
    //   system: 'You are a helpful support agent. Use searchNovuDocs to find Novu documentation.',
    //   tools: [searchNovuDocs],
    //   needsApproval: (toolCall) => toolCall.name === 'searchNovuDocs',
    // };
  },

  // Return a string or card to reply; return nothing to silently acknowledge the click
  onAction: async (action, ctx) => {
    if (action.id.startsWith('topic-') && action.value) {
      ctx.metadata.set('topic', action.value);

      return `Topic set to **${action.value}**. Describe your issue and I'll help.`;
    }
  },
});
