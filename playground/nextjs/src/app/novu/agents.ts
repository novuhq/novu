import { agent } from '@novu/framework';

function formatHumanResponse(response: {
  kind: string;
  status: string;
  expired: boolean;
  text?: string;
  optionId?: string;
}): string {
  if (response.expired) {
    return `That ${response.kind} request expired before I got an answer.`;
  }

  const detail = response.text ?? response.optionId;

  return detail
    ? `Got it — ${response.kind} is **${response.status}** (${detail}).`
    : `Got it — ${response.kind} is **${response.status}**.`;
}

/**
 * Framework HITL demo: `ctx.ask` / `ctx.approve` / `ctx.choose` / `ctx.tell`
 * deliver a card into this agent's own conversation. The verdict arrives on
 * the next `onMessage` (ask) or `onAction` (approve / choose) with
 * `ctx.humanResponse` set.
 *
 * Identifier: `human-hitl`. `IS_AGENT_HUMAN_HITL_ENABLED` gates in-thread
 * `ctx.*` helpers. Answers (in-thread or from `POST /v1/human/interactions`)
 * arrive on the next `onMessage` / `onAction` with `ctx.humanResponse` set.
 * Kickoff phrases: approve / ask / choose / tell.
 */
export const humanHitlAgent = agent('human-hitl', {
  onMessage: async (message, ctx) => {
    if (ctx.humanResponse) {
      return formatHumanResponse(ctx.humanResponse);
    }

    const text = message.text.trim().toLowerCase();

    if (text.includes('approve')) {
      ctx.approve('Deploy v2.4.1 to production?');

      return 'Sent an approval card in this thread. Approve or deny it to continue.';
    }

    if (text.includes('choose')) {
      ctx.choose('Which region should we deploy to?', ['us-east', 'eu-west', 'ap-south']);

      return 'Pick a region on the card in this thread.';
    }

    if (text.includes('tell')) {
      ctx.tell('Deploy finished. v2.4.1 is live.');

      return 'Posted a one-way notice. Nothing to wait on.';
    }

    if (text.includes('ask')) {
      ctx.ask('What environment should we deploy to?');

      return 'Asked a question in this thread. Reply with the environment name.';
    }

    return [
      'Framework HITL demo. Message me with one of:',
      '- `approve` — `ctx.approve("Deploy v2.4.1 to production?")`',
      '- `ask` — `ctx.ask("What environment should we deploy to?")`',
      '- `choose` — `ctx.choose("Which region?", ["us-east", "eu-west", "ap-south"])`',
      '- `tell` — `ctx.tell("Deploy finished. v2.4.1 is live.")`',
    ].join('\n');
  },
  onAction: async (_action, ctx) => {
    if (ctx.humanResponse) {
      return formatHumanResponse(ctx.humanResponse);
    }
  },
});
