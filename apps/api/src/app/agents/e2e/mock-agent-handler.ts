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

import {
  Actions,
  agent,
  Button,
  Card,
  CardLink,
  CardText,
  Client,
  Divider,
  Select,
  SelectOption,
  serve,
} from '@novu/framework/express';
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

    if (userText.toLowerCase().includes('card')) {
      await ctx.reply(
        Card({
          title: `Order #${Math.floor(Math.random() * 9000) + 1000}`,
          children: [
            CardText('Your order is ready for pickup.'),
            Actions([
              Button({ id: 'confirm', label: 'Confirm Pickup', style: 'primary' }),
              Button({ id: 'cancel', label: 'Cancel Order', style: 'danger' }),
            ]),
          ],
        })
      );

      return;
    }

    if (userText.toLowerCase().includes('incident')) {
      await ctx.reply(
        Card({
          title: `Incident #${Math.floor(Math.random() * 9000) + 1000} — DB Latency Spike`,
          children: [
            CardText('*P1 — Production database latency spike*'),
            CardText('Detected at 14:32 UTC. Response times exceeded 2s threshold for 3 minutes.'),
            Divider(),
            CardText('*Status:* Investigating  |  *Service:* payments-api  |  *Region:* us-east-1'),
            Divider(),
            Select({
              id: 'assign',
              label: 'Assign to on-call',
              options: [
                SelectOption({ value: 'alice', label: 'Alice Chen' }),
                SelectOption({ value: 'bob', label: 'Bob Martinez' }),
                SelectOption({ value: 'carol', label: 'Carol Wu' }),
              ],
            }),
            Actions([
              Button({ id: 'ack', label: 'Acknowledge', style: 'primary' }),
              Button({ id: 'escalate', label: 'Escalate', style: 'danger' }),
            ]),
            CardLink({ url: 'https://grafana.example.com/d/abc', label: 'View Grafana Dashboard' }),
          ],
        })
      );

      return;
    }

    if (userText.toLowerCase().includes('markdown')) {
      await ctx.reply(
        [
          `**Echo:** ${userText}`,
          '',
          '| Metric | Value |',
          '|--------|-------|',
          '| Latency | 142ms |',
          '| Throughput | 1.2k rps |',
          '| Error rate | 0.02% |',
          '',
          '> Sent from _Novu Agent Framework_',
        ].join('\n')
      );

      return;
    }

    await ctx.reply(`Echo: ${userText}`);
  },

  onAction: async (ctx) => {
    console.log('\n─────────────────────────────────────────');
    console.log(`[${ctx.event}] action: ${ctx.action?.actionId} = ${ctx.action?.value ?? '(no value)'}`);
    console.log('─────────────────────────────────────────');

    const actionId = ctx.action?.actionId ?? 'unknown';
    const value = ctx.action?.value;

    if (actionId === 'ack') {
      await ctx.reply(
        Card({
          title: 'Incident Acknowledged',
          children: [
            CardText(
              `Acknowledged by *${ctx.subscriber?.firstName ?? 'unknown'}* at ${new Date().toLocaleTimeString()}.`
            ),
            Actions([Button({ id: 'resolve', label: 'Resolve Incident', style: 'primary' })]),
          ],
        })
      );
    } else if (actionId === 'resolve') {
      ctx.resolve('Incident resolved via action');
      await ctx.reply(`Incident resolved by *${ctx.subscriber?.firstName ?? 'unknown'}*.`);
    } else if (actionId === 'assign') {
      await ctx.reply(`On-call assignment updated to *${value}*.`);
    } else if (actionId === 'escalate') {
      await ctx.reply(
        `**Escalated** — paging the secondary on-call team.\n\n_Triggered by ${ctx.subscriber?.firstName ?? 'unknown'}_`
      );
    } else {
      await ctx.reply(`Got action: *${actionId}*${value ? ` = ${value}` : ''}`);
    }
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

const server = app.listen(PORT, () => {
  console.log(`\nAgent Handler (using @novu/framework) running on http://localhost:${PORT}/api/novu`);
  console.log('\nWaiting for bridge calls...\n');
});

server.on('error', (err) => console.error('Server error:', err));
server.on('close', () => console.log('Server closed'));
process.on('uncaughtException', (err) => console.error('Uncaught:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
