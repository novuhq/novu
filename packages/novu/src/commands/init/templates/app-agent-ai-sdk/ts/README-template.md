# Novu AI SDK Agent

A conversational AI agent powered by [Novu](https://novu.co), the [Vercel AI SDK](https://sdk.vercel.ai/), and [Next.js](https://nextjs.org).

The scaffold uses `@novu/framework/ai-sdk` and ships with an **echo demo** that works without any LLM API key. The `ai` package (v6) is already installed — when you're ready, uncomment the `generateText` example in your agent handler and add your model provider.

## Getting Started

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Connect a chat platform in the [Novu Dashboard](https://dashboard.novu.co).

3. Try the echo demo — send messages in your connected channel and see cards, actions, and markdown replies.

4. Wire your LLM when ready:

   - Install a provider:

     ```bash
     npm install @ai-sdk/openai        # OpenAI
     # npm install @ai-sdk/anthropic   # Anthropic
     # npm install @ai-sdk/google      # Google
     ```

   - Set your provider API key (e.g. `OPENAI_API_KEY` in `.env.local`).

   - Uncomment the `generateText` block at the bottom of `app/novu/agents/support-agent.tsx` (the `searchNovuDocs` tool is already defined above).

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

Uncomment the LLM imports at the top of `app/novu/agents/support-agent.tsx`, then replace the echo `return` with:

```typescript
return generateText({
  model: openai('gpt-4o-mini'),
  instructions:
    'You are a helpful support agent. Use searchNovuDocs to find Novu documentation.',
  messages: toModelMessages(ctx),
  tools: { searchNovuDocs },
});
```

The scaffold includes a `searchNovuDocs` tool with `needsApproval: true` — it fetches the live Novu docs index. Uncomment the `generateText` return to wire your LLM, then try asking "how does tool approval work in Novu?" to see the approval card flow.

Use `generateText` for simple non-streaming responses. For streaming, return `streamText(...)` from `onMessage` instead — see the AI SDK DX guide.

## Learn More

- [Novu Agent Docs](https://docs.novu.co/agents)
- [Novu Framework SDK](https://docs.novu.co/framework)
- [AI SDK DX Guide](https://docs.novu.co/agents/ai-sdk)
- [Next.js Documentation](https://nextjs.org/docs)
