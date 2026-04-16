# Novu Agent

A conversational AI agent powered by [Novu](https://novu.co) and [Next.js](https://nextjs.org).

## Getting Started

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Connect a chat platform in the [Novu Dashboard](https://dashboard.novu.co).

3. Replace the demo handler in `app/novu/agents/support-agent.tsx` with your LLM call.

Your agent is served at `/api/novu` and handles incoming messages via the Novu Bridge protocol.

## Project Structure

```text
app/
  api/novu/route.ts        → Bridge endpoint serving your agent
  novu/agents/
    index.ts               → Agent exports
    support-agent.tsx      → Your agent handler (edit this!)
  page.tsx                 → Landing page
```

## Agent API

Your agent handler receives a context object with:

| Method / Property | Description |
|---|---|
| `ctx.message` | The inbound message (text, author, timestamp) |
| `ctx.conversation` | Current conversation state and metadata |
| `ctx.history` | Recent conversation history |
| `ctx.subscriber` | Resolved subscriber info |
| `ctx.platform` | Source platform (slack, teams, whatsapp) |
| `ctx.reply(content)` | Send a reply (text, Markdown, or Card) |
| `ctx.metadata.set(k, v)` | Set conversation metadata |
| `ctx.resolve(summary?)` | Mark conversation as resolved |
| `ctx.trigger(workflowId)` | Trigger a Novu workflow |

## Wiring Up Your LLM

Replace the demo handler in `app/novu/agents/support-agent.tsx` with your LLM call:

```typescript
onMessage: async (ctx) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful support agent.' },
      ...ctx.history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: ctx.message?.text ?? '' },
    ],
  });

  await ctx.reply(response.choices[0].message.content ?? '');
},
```

## Learn More

- [Novu Agent Docs](https://docs.novu.co/agents)
- [Novu Framework SDK](https://docs.novu.co/framework)
- [Next.js Documentation](https://nextjs.org/docs)
