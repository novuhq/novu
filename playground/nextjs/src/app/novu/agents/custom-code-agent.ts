import { Actions, type AgentHumanResponse, type AgentMessageContext, agent, Button, Card } from '@novu/framework';
import * as features from './features';

const HELP = [
  'Custom-code agent (plain `agent()`, no model). Message me with one of:',
  '- `card` — a card with a table, a chart, a button and a select',
  '- `remember <note>` / `recall` — conversation metadata',
  '- `notify <name>` — triggers `all-channels-workflow` for you',
  '- `done` — resolves the conversation (`onResolve` then triggers a follow-up notification)',
  '- `progress` — a typing indicator, then a reply that gets edited',
  '- `delete` — a reply that deletes itself',
  '- `file` — a reply with a CSV file',
  '- `quote <text>` — a reply quoting your message',
  '- `react` — a 👍 on your message',
  '- `emit` — a custom `progress` event for the client app',
  '- `approve` / `multi-approve` — `ctx.approve(...)`, the second one to `alice` and `bob`',
  '- `custom-approve` / `custom-chrome-approve` — `ctx.approve({ render })` / `ctx.approve({ card })`',
  '- `ask` / `choose` / `tell` — `ctx.ask(...)` / `ctx.choose(...)` / `ctx.tell(...)`',
  '- `weather <city>` — a `get_weather` tool call gated by `ctx.toolApproval`',
].join('\n');

const DEPLOY_QUESTION = 'Deploy v2.4.1 to production?';

// HITL lives here only: plain `agent()` handles the answer itself in onAction/onMessage.
function approve(ctx: AgentMessageContext, to?: string[]) {
  ctx.approve(DEPLOY_QUESTION, to ? { to } : undefined);

  return 'Sent an approval card. Approve or deny it to continue.';
}

function approveWithCustomCard(ctx: AgentMessageContext) {
  ctx.approve({
    render: ({ actionIds }) =>
      Card({
        title: DEPLOY_QUESTION,
        subtitle: 'From Deployment Agent',
        children: [
          Actions([
            Button({ label: 'Yes', id: actionIds.approve, actionType: 'action', style: 'primary' }),
            Button({ label: 'No', id: actionIds.deny, actionType: 'action' }),
          ]),
        ],
      }),
  });

  return 'Sent a custom approval card. Approve or deny it to continue.';
}

function approveWithCustomChrome(ctx: AgentMessageContext) {
  ctx.approve({
    card: {
      title: DEPLOY_QUESTION,
      subtitle: 'From Deployment Agent',
      body: 'This is a custom chrome approval card.',
      approveLabel: 'Yes',
      denyLabel: 'No',
    },
  });

  return 'Sent a custom chrome approval card. Approve or deny it to continue.';
}

function formatHumanResponse(response: AgentHumanResponse) {
  if (response.expired) return `That ${response.kind} request expired before I got an answer.`;
  const detail = response.text ?? response.optionId;

  return detail
    ? `Got it — ${response.kind} is **${response.status}** (${detail}).`
    : `Got it — ${response.kind} is **${response.status}**.`;
}

/** Every feature behind a typed command, so it behaves the same on every run. */
export const customCodeAgent = agent('custom-code-agent', {
  ...features.channelHandlers,
  onMessage: async (message, ctx) => {
    if (ctx.humanResponse) return formatHumanResponse(ctx.humanResponse);

    const [command = '', ...rest] = message.text.trim().split(/\s+/);
    const arg = rest.join(' ');
    switch (command.toLowerCase()) {
      case 'card':
        await features.showCard(ctx);

        return;
      case 'remember':
        return features.remember(ctx, arg);
      case 'recall':
        return features.recall(ctx);
      case 'notify':
        return features.notify(ctx, arg);
      case 'done':
        return features.resolve(ctx);
      case 'progress':
        await features.showProgress(ctx);

        return;
      case 'delete':
        await features.replyThenDelete(ctx);

        return;
      case 'file':
        await features.sendFile(ctx);

        return;
      case 'quote':
        await features.quote(ctx, message);

        return;
      case 'react':
        return features.react(ctx, message);
      case 'emit':
        return features.emitProgress(ctx);
      case 'approve':
        return approve(ctx);
      case 'multi-approve':
        return approve(ctx, ['alice', 'bob']);
      case 'custom-approve':
        return approveWithCustomCard(ctx);
      case 'custom-chrome-approve':
        return approveWithCustomChrome(ctx);
      case 'ask':
        ctx.ask('What environment should we deploy to?');

        return 'Asked a question. Reply in this thread.';
      case 'choose':
        ctx.choose('Which region should we deploy to?', ['us-east', 'eu-west', 'ap-south']);

        return 'Sent a card with options. Pick one to continue.';
      case 'tell':
        ctx.tell('Deploy finished. v2.4.1 is live.');

        return 'Posted a one-way notice. Nothing to wait on.';
      case 'weather':
        await ctx.toolApproval.request({ id: `weather-${Date.now()}`, name: 'get_weather', input: { city: arg || 'Berlin' } });

        return;
      default:
        return HELP;
    }
  },
  onAction: (action, ctx) =>
    ctx.humanResponse ? formatHumanResponse(ctx.humanResponse) : features.describeAction(action),
  onToolApproval: ({ toolCall, approved }) =>
    approved ? features.weather(String((toolCall.input as { city?: string }).city)) : `Skipped ${toolCall.name}`,
});
