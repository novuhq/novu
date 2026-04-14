/**
 * Agent Handler — E2E test utility using @novu/framework
 *
 * This is a real serve() endpoint that uses the agent SDK to handle bridge calls.
 * Run alongside the Novu API to test the full agent round-trip with Slack.
 *
 * Usage:
 *   NOVU_SECRET_KEY=<your-env-secret-key> npx ts-node apps/api/src/app/agents/e2e/mock-agent-handler.ts
 *
 * Setup:
 *   1. Start Novu API: pnpm start:api:dev
 *   2. Set environment bridge URL to http://localhost:4111/api/novu (dashboard or direct DB update)
 *   3. Create an agent + link a Slack integration via the API
 *   4. Point Slack event subscriptions to your Novu webhook URL (ngrok/tunnel)
 *   5. @mention the bot in Slack — watch the round-trip in the logs
 */

import { agent, Client, serve } from '@novu/framework/express';
import express from 'express';

const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const PORT = Number(process.env.MOCK_PORT) || 4111;

if (!NOVU_SECRET_KEY) {
  console.error('NOVU_SECRET_KEY is required. Set it to your environment secret key.');
  process.exit(1);
}

const echoBot = agent('novu-agent', {
  onMessage: async (ctx) => {
    console.log('\n─────────────────────────────────────────');
    console.log(`[${ctx.event}] from ${ctx.subscriber?.firstName ?? 'unknown'} on ${ctx.platform}`);
    console.log(`Message: ${ctx.message?.text ?? '(none)'}`);
    console.log(`Conversation: ${ctx.conversation.identifier} (${ctx.conversation.status})`);
    console.log(`History: ${ctx.history.length} entries`);
    console.log('─────────────────────────────────────────');

    const userText = ctx.message?.text ?? '';
    const turnCount = (ctx.conversation.metadata?.turnCount as number) ?? 0;

    ctx.metadata.set('turnCount', turnCount + 1);

    if (userText.toLowerCase().includes('done')) {
      ctx.resolve(`Conversation resolved after ${turnCount + 1} turns`);
      await ctx.reply('Thanks for chatting! Resolving this conversation.');

      return;
    }

    await ctx.reply(`Echo: ${userText}`);
  },

  onResolve: async (ctx) => {
    console.log(`\n[onResolve] Conversation ${ctx.conversation.identifier} closed.`);
    ctx.metadata.set('resolvedAt', new Date().toISOString());
  },
});

const app = express();
app.use(express.json());

app.use(
  '/api/novu',
  serve({
    agents: [echoBot],
    client: new Client({
      secretKey: NOVU_SECRET_KEY,
      strictAuthentication: false,
    }),
  })
);

app.listen(PORT, () => {
  console.log(`\nAgent Handler (using @novu/framework) running on http://localhost:${PORT}/api/novu`);
  console.log('\nWaiting for bridge calls...\n');
});
