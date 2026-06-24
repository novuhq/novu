# Novu

**The fastest way to put your Chat SDK agent in front of customers — on Slack, Teams, WhatsApp, Telegram, and email.**

Novu manages the credentials, identity, and delivery for every channel, so your Chat SDK app stays the agent and ships to production in one command.

## Install

```bash
npm install @novu/chat-sdk-adapter chat @chat-adapter/state-memory
```

## Quick start

1. **Install** the adapter (see above).
2. **Wire the adapter** in your Chat SDK app
3. **Connect a channel** — run `npx novu connect --runtime chat-sdk` and pick Slack, Email, Telegram, WhatsApp, or Microsoft Teams.

```typescript
import { Chat } from "chat";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createNovuAdapter } from "@novu/chat-sdk-adapter";

const novu = createNovuAdapter();

const chat = new Chat({
  userName: "support",
  adapters: { novu },
  state: createMemoryState(),
});

chat.onNewMention(async (thread, message) => {
  await thread.post(`Hi! You said: ${message.text}`);
});

chat.onSubscribedMessage(async (thread, message) => {
  await thread.post(`echo: ${message.text}`);
});

await chat.initialize();
```

Then connect your agent to a real channel:

```bash
npx novu connect --runtime chat-sdk
```

The CLI authenticates your Novu account, creates your bridge agent, writes `NOVU_SECRET_KEY` and `NOVU_AGENT_IDENTIFIER` to your env, adds the `dev:novu` script, and opens an interactive channel picker (Slack, Email, Telegram, WhatsApp, Microsoft Teams). It provisions the provider integration and stores credentials in Novu — nothing sensitive lives in your app.

## Why Novu

Everything below is what you'd otherwise build and maintain against each platform's raw APIs:

- **Managed credentials & channel setup** — OAuth, token storage and rotation, and Slack Connect are handled by Novu. No platform secrets live in your app.
- **Unified identity** — every channel resolves to a single Novu subscriber mapped to your own user, so your agent always knows who it's talking to.
- **Built-in observability** — delivery status and full conversation history for every message, out of the box.
- **Notify and reply in one loop** — your agent sends a proactive notification and handles the reply on the same channel, across every channel, from one handler set.

## Configuration

Set via the environment (the CLI writes these for you) or pass them to `createNovuAdapter({ ... })`:


| Variable                | Description                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `NOVU_SECRET_KEY`       | Novu API key — authorizes replies and verifies the inbound HMAC. Set automatically by `npx novu connect`. |
| `NOVU_AGENT_IDENTIFIER` | Your bridge agent ID — set automatically by `npx novu connect`.              |
| `NOVU_API_BASE_URL`     | API base URL. Defaults to `https://api.novu.co`.                                                          |


## Novu context

Inside any handler, `getNovuContext(thread)` unlocks Novu-native data:

```typescript
import { getNovuContext } from "@novu/chat-sdk-adapter";

chat.onSubscribedMessage(async (thread, message) => {
  const ctx = getNovuContext(thread);

  const subscriber = await ctx.getSubscriber(); // email, phone, locale, custom data
  const history = await ctx.getHistory(); // canonical transcript — ideal for LLM context
  const ticketId = await ctx.getMetadata("ticketId");

  if (subscriber?.data?.plan === "enterprise") {
    await thread.post("Priority support enabled.");
  }
});
```

## Proactive multi-channel notifications

Your agent can push notifications outside an active conversation by triggering a Novu workflow. Define the workflow once in Novu with the channels you want (Slack, email, WhatsApp, etc.); a single `trigger` call delivers to every step in that workflow.

By default, the trigger targets the subscriber on the current conversation. Pass explicit recipients to notify someone else or a topic:

```typescript
import { getNovuContext } from "@novu/chat-sdk-adapter";

chat.onSubscribedMessage(async (thread, message) => {
  const ctx = getNovuContext(thread);

  // Notify the same user on every channel in the "order-shipped" workflow.
  await ctx.trigger("order-shipped", {
    payload: {
      orderId: "1234",
      trackingUrl: "https://example.com/track/1234",
    },
  });

  // Escalate to a different subscriber on a separate workflow.
  await ctx.trigger("manager-alert", {
    to: { subscriberId: "manager-42" },
    payload: { reason: message.text },
  });

  // Fan out to a Novu topic.
  await ctx.trigger("incident-broadcast", {
    to: { type: "Topic", topicKey: "on-call" },
    payload: { severity: "high" },
  });
});
```

When the user replies on any channel Novu delivered to, the message routes back through the same bridge and your existing handlers — one agent loop for both proactive notifications and conversational replies.

Create workflows in the [Novu dashboard](https://docs.novu.co) or via the API, then reference them by workflow ID from your agent.

## Connect channels

After your adapter is wired, `npx novu connect --runtime chat-sdk` is the fastest way to put your agent on a real channel. The CLI runs an interactive flow:

1. **Authenticate** — sign in to Novu (or pass `--secret-key` for an existing account).
2. **Create or reuse a bridge agent** — one agent per Chat SDK app.
3. **Pick a channel** — Slack, Email, Telegram, WhatsApp, Microsoft Teams, or skip for now.
4. **Finish the handoff** — the CLI creates the provider integration and guides you through the last step (Slack OAuth, BotFather token, send a test email, etc.).

What Novu handles for you:


| Channel              | What the CLI sets up                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Slack**            | Creates the Slack app (manifest quick-setup), stores OAuth credentials, opens the install flow |
| **Email**            | Provisions a unique agent inbox (see below)                                                    |
| **Telegram**         | Links your @BotFather bot token                                                                |
| **WhatsApp / Teams** | Opens the Novu dashboard to finish provider setup                                              |


Re-run `npx novu connect --runtime chat-sdk` to add another channel or refresh credentials. Each run creates a new agent unless you pick an existing one.

## Email

Pick **Email** in the connect channel picker, or re-run `npx novu connect --runtime chat-sdk` and choose it from the menu.

Novu provisions a **unique inbound address** for your agent — for example `my-agent-abc@agentconnect.sh`. Anyone can email that address; Novu normalizes the thread and forwards it to your Chat SDK bridge. Your agent replies from the same inbox, and the conversation continues over email like any other channel.

Unlike Slack or Telegram, email starts with the user sending the first message. The CLI opens a pre-filled draft so you can send a test email and confirm the connection.

**Custom domains** — the shared `@agentconnect.sh` address works out of the box. For production, configure your own inbound domain in the [Novu dashboard](https://docs.novu.co) (Domains → add domain → verify DNS). Route mail to your agent on `@yourcompany.com` while keeping the same bridge handlers.

Use `getNovuContext(thread).getEmailContext()` inside handlers for email-specific metadata (routing domain, thread headers).

## Channels

Slack · Microsoft Teams · WhatsApp · Telegram · Email — one handler set serves them all, with no per-channel code.

## Examples

A complete Next.js boilerplate — live bridge route, setup UI, bridge-status panel, and a handler set covering every capability: **[novu-chat-sdk-example](https://github.com/novuhq/novu-chat-sdk-example)**.

It ships one bot that exercises each handler. Message it on any connected channel:


| Message      | Demonstrates                                                    |
| ------------ | --------------------------------------------------------------- |
| *(any text)* | Echo reply tagged with the originating platform                 |
| `card`       | Posting an interactive Chat SDK card                            |
| `whoami`     | `getNovuContext()` — subscriber profile + unified user identity |
| `resolve`    | Resolving the Novu conversation from the agent                  |


Handler coverage: `onNewMention`, `onSubscribedMessage`, `onAction` (button clicks), and `onReaction`.

## Resources

- Adapter reference — [@novu/chat-sdk-adapter](https://www.npmjs.com/package/@novu/chat-sdk-adapter)
- Example app — [novu-chat-sdk-example](https://github.com/novuhq/novu-chat-sdk-example)
- Agent onboarding guide — [docs](https://github.com/novuhq/novu/blob/main/packages/shared/docs/agent-onboarding.md)

## Feature support


| Capability                                               | Support                       |
| -------------------------------------------------------- | ----------------------------- |
| Inbound messages (`onNewMention`, `onSubscribedMessage`) | ✅                             |
| Button actions (`onAction`)                              | ✅                             |
| Inbound reactions (`onReaction`)                         | ✅                             |
| Post message (markdown)                                  | ✅                             |
| Rich cards                                               | ✅                             |
| File attachments (outbound)                              | ✅                             |
| Edit message (in place)                                  | ✅                             |
| Add reaction                                             | ✅                             |
| Subscriber identity (`getUser`, `getSubscriber`)         | ✅                             |
| Conversation history (`getHistory`)                      | ✅                             |
| Conversation metadata (`getMetadata`, `setMetadata`)     | ✅                             |
| Proactive workflow trigger (`getNovuContext().trigger`)  | ✅                             |
| Cross-channel delivery via Novu workflows                | ✅                             |
| Resolve conversation (`resolve`)                         | ✅                             |
| Delivery dedup                                           | ✅                             |
| Typing indicator (`startTyping`)                         | — no typing channel (no-op)   |
| Remove reaction                                          | — reply API adds only (no-op) |
| Delete message                                           | ❌ Not in v1                   |
| Outbound-initiated DM (`openDM`)                         | ❌ Not in v1                   |
| Modals                                                   | ❌ Not in v1                   |
