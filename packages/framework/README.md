<div align="center">
  <a href="https://novu.co?utm_source=github" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img alt="Novu Logo" src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280"/>
  </picture>
  </a>
</div>

# Novu Framework

[![Version](https://img.shields.io/npm/v/@novu/framework.svg)](https://www.npmjs.org/package/@novu/framework)
[![Downloads](https://img.shields.io/npm/dm/@novu/framework.svg)](https://www.npmjs.com/package/@novu/framework)

`@novu/framework` is Novu's code-first SDK for two things:

1. **Conversational agents** — define bridge agents in your codebase and connect them to Slack, Email, Telegram, WhatsApp, and Microsoft Teams with `npx novu connect`.
2. **Notification workflows** — write durable, multi-channel notification flows as TypeScript functions.

Learn more in the [Framework docs](https://docs.novu.co/framework/quickstart) and [managed agent quickstart](https://docs.novu.co/agents/get-started/claude-managed).

## Installation

```bash
npm install @novu/framework
```

## Connect an agent to channels

The fastest path is the Novu CLI — it creates the agent in Novu Cloud, provisions channel credentials, and (for bridge runtimes) wires your local app:

```bash
npx novu@latest connect
```

For a self-hosted agent in your repo, pick a bridge runtime when prompted, or pass one explicitly:

```bash
# Vercel AI SDK agent
npx novu@latest connect --runtime ai-sdk

# Chat SDK multi-channel agent
npx novu@latest connect --runtime chat-sdk
```

Re-run `npx novu connect` to add another channel. Each run connects one channel to one agent.

## Bridge agents

Define agents in your codebase and serve them on a Novu bridge endpoint. Use `@novu/framework/ai-sdk` when your agent is built with the [Vercel AI SDK](https://ai-sdk.dev/):

```typescript
import { serve } from '@novu/framework/next';
import { agent } from '@novu/framework/ai-sdk';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const supportAgent = agent('support-bot', {
  onMessage: async (message, ctx) => {
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: await ctx.toModelMessages(),
    });

    return result;
  },
});

const { GET, POST, OPTIONS } = serve({ agents: [supportAgent] });
```

For custom handlers without the AI SDK, use the core `agent()` export:

```typescript
import { agent } from '@novu/framework';
import { serve } from '@novu/framework/next';

const supportAgent = agent('support-bot', {
  onMessage: async (message, ctx) => {
    await ctx.reply(`You said: ${message.text}`);
  },
});

const { GET, POST, OPTIONS } = serve({ agents: [supportAgent] });
```

After your bridge is running, connect channels:

```bash
npx novu@latest connect --runtime ai-sdk --channel slack
npx novu@latest sync -b https://your-app.com/api/novu -s "$NOVU_SECRET_KEY"
```

Bridge runtimes supported by `novu connect`: `ai-sdk`, `langchain`, `custom-code`, `chat-sdk`.

## Notification workflows

Write notification workflows as functions that execute business logic and use your preferred libraries for email, SMS, and chat generation. Use [React.Email](https://react.email/), [MJML](https://mjml.io/), or any other template generator.

```typescript
import { workflow, CronExpression } from '@novu/framework';
import { serve } from '@novu/framework/next';
import { z } from 'zod';

const weeklyComments = workflow(
  'comment-on-post',
  async ({ payload, step }) => {
    const inAppResponse = await step.inApp('new-comment', async () => ({
      body: `You have a new comment on your post ${payload.comment}`,
    }));

    const weeklyDigest = await step.digest('weekly-digest', () => ({
      cron: CronExpression.EVERY_WEEK,
    }));

    await step.email(
      'weekly-comments',
      async (controls) => ({
        subject: `${controls.prefix} - Weekly post comments (${weeklyDigest.events.length})`,
        body: `Weekly digest: ${weeklyDigest.events.map(({ payload }) => payload.comment).join(', ')}`,
      }),
      {
        skip: () => weeklyDigest.events.length === 0,
        controlSchema: z.object({ prefix: z.string().describe('The prefix of the subject.').default('Hi!') }),
      }
    );
  },
  { payloadSchema: z.object({ comment: z.string().describe('The comment on the post.') }) }
);

const { GET, POST, OPTIONS } = serve({ workflows: [weeklyComments] });

weeklyComments.trigger({ to: 'user:123', comment: 'This is a comment on a post' });
```

Sync workflows with Novu Cloud:

```bash
npx novu@latest sync -b https://your-app.com/api/novu -s "$NOVU_SECRET_KEY"
```

For local workflow development with Novu Studio, see the [Novu CLI `dev` command](../novu/README.MD#local-novu-studio).

## Framework adapters

Serve workflows and agents from your framework of choice:

| Import | Framework |
| --- | --- |
| `@novu/framework/next` | Next.js |
| `@novu/framework/nest` | NestJS |
| `@novu/framework/express` | Express |
| `@novu/framework/h3` | H3 / Nuxt |
| `@novu/framework/hono` | Hono |
| `@novu/framework/lambda` | AWS Lambda |
| `@novu/framework/sveltekit` | SvelteKit |
| `@novu/framework/remix` | Remix |

Additional exports:

| Import | Purpose |
| --- | --- |
| `@novu/framework/ai-sdk` | Vercel AI SDK agent helpers |
| `@novu/framework/step-resolver` | Deploy custom step handlers |
| `@novu/framework/validators` | Schema validation utilities |

## Links

- [Managed agent quickstart](https://docs.novu.co/agents/get-started/claude-managed)
- [Framework quickstart](https://docs.novu.co/framework/quickstart)
- [Novu CLI](../novu/README.MD)
- [Chat SDK adapter](https://www.npmjs.com/package/@novu/chat-sdk-adapter)
