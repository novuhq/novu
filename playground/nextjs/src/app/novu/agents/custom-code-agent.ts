import { agent } from '@novu/framework';
import * as features from './features';

const HELP = [
  'Custom-code agent (plain `agent()`, no model). Message me with one of:',
  '- `card` — a card with a table, a chart, a button and a select',
  '- `remember <note>` / `recall` — conversation metadata',
  '- `notify <name>` — triggers `all-channels-workflow` for you',
  '- `done` — resolves the conversation',
  '- `approve` / `multi-approve` — `ctx.approve(...)`, the second one to `alice` and `bob`',
  '- `custom-approve` / `custom-chrome-approve` — `ctx.approve({ render })` / `ctx.approve({ card })`',
  '- `ask` / `choose` / `tell` — `ctx.ask(...)` / `ctx.choose(...)` / `ctx.tell(...)`',
  '- `weather <city>` — a `get_weather` tool call gated by `ctx.toolApproval`',
].join('\n');

/** Every feature from `features.ts` behind a typed command, so it behaves the same on every run. */
export const customCodeAgent = agent('custom-code-agent', {
  onMessage: async (message, ctx) => {
    if (ctx.humanResponse) return features.formatHumanResponse(ctx.humanResponse);

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
      case 'approve':
        return features.approve(ctx);
      case 'multi-approve':
        return features.approve(ctx, undefined, ['alice', 'bob']);
      case 'custom-approve':
        return features.approveWithCustomCard(ctx);
      case 'custom-chrome-approve':
        return features.approveWithCustomChrome(ctx);
      case 'ask':
        return features.ask(ctx);
      case 'choose':
        return features.choose(ctx);
      case 'tell':
        return features.tell(ctx);
      case 'weather':
        await ctx.toolApproval.request({ id: `weather-${Date.now()}`, name: 'get_weather', input: { city: arg || 'Berlin' } });

        return;
      default:
        return HELP;
    }
  },
  onAction: (action, ctx) =>
    ctx.humanResponse ? features.formatHumanResponse(ctx.humanResponse) : features.describeAction(action),
  onToolApproval: ({ toolCall, approved }) =>
    approved ? features.weather(String((toolCall.input as { city?: string }).city)) : `Skipped ${toolCall.name}`,
});
