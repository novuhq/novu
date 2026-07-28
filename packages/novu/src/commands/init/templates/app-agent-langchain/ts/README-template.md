# Novu LangChain Agent

A conversational AI agent powered by [Novu](https://novu.co), [LangChain](https://www.langchain.com/), and [Next.js](https://nextjs.org).

The scaffold uses `@novu/framework/langchain` and ships with an **echo demo** that works without any LLM API key. When you're ready, return a `{ model, system, tools }` config from your agent handler and add your model provider — Novu runs the agent and owns the tool-approval loop for you.

## Getting Started

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Connect a chat platform in the [Novu Dashboard](https://dashboard.novu.co).

3. Try the echo demo — send messages in your connected channel and see cards, actions, and markdown replies.

4. Wire your LLM when ready:

   - Install LangChain and a provider:

     ```bash
     npm install langchain @langchain/core
     npm install @langchain/openai          # OpenAI
     # npm install @langchain/anthropic     # Anthropic
     # npm install @langchain/google-genai  # Google
     ```

   - Set your provider API key (e.g. `OPENAI_API_KEY` in `.env.local`).

   - Uncomment the LangChain config return in `app/novu/agents/support-agent.tsx` (the `searchNovuDocs` tool is already defined above).

Your agent is served at `/api/novu` and handles incoming messages via the Novu Bridge protocol.

## Project Structure

```text
app/
  api/novu/route.ts        → Bridge endpoint serving your agent
  novu/agents/
    index.ts               → Agent exports
    support-agent.tsx      → Your agent handler (edit this!)
    tools/
      search-novu-docs.ts  → Example tool implementation
  page.tsx                 → Landing page
```

## Agent API

Your `onMessage` handler is called with `(message, ctx)`:

- **`message`** — The inbound message (text, author, timestamp)

| Method / Property | Description |
|---|---|
| `ctx.conversation` | Current conversation state and metadata |
| `ctx.history` | Recent conversation history |
| `ctx.subscriber` | Resolved subscriber info |
| `ctx.platform` | Source platform (slack, teams, whatsapp) |
| `ctx.reply(content)` | Send a reply (text, Markdown, or Card) |
| `ctx.metadata.set(k, v)` | Set conversation metadata |
| `ctx.resolve(summary?)` | Mark conversation as resolved |
| `ctx.trigger(workflowId)` | Trigger a Novu workflow |

## Wiring Up Your LLM

Replace the echo `return` in `app/novu/agents/support-agent.tsx` with a LangChain agent config. Prefer a statically imported chat model (works with Turbopack out of the box):

```typescript
import { ChatOpenAI } from '@langchain/openai';

return {
  model: new ChatOpenAI({ model: 'gpt-4o-mini' }),
  system:
    'You are a helpful support agent. Use searchNovuDocs to find Novu documentation.',
  tools: [searchNovuDocs],
  needsApproval: (toolCall) => toolCall.name === 'searchNovuDocs',
};
```

Model strings like `model: 'openai:gpt-4o-mini'` also work — this scaffold already lists LangChain packages in `serverExternalPackages` in `next.config.mjs` so Turbopack can resolve LangChain's dynamic provider imports.

The scaffold includes a `searchNovuDocs` tool gated behind approval — it fetches the live Novu docs index. Uncomment the config return to wire your LLM, then try asking "how does tool approval work in Novu?" to see the approval card flow.

## Learn More

- [Novu Agent Docs](https://docs.novu.co/agents)
- [Novu Framework SDK](https://docs.novu.co/framework)
- [LangChain Documentation](https://docs.langchain.com/)
- [Next.js Documentation](https://nextjs.org/docs)
