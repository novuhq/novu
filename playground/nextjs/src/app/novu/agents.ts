import { Actions, agent, Button, Card } from '@novu/framework';

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
 *
 * Managed agents use the same verbs via the `novu_human` platform tool plus the
 * `novu-human` skill (`ctx.*` is framework-only).
 */
export const humanHitlAgent = agent('human-hitl', {
  onMessage: async (message, ctx) => {
    if (ctx.humanResponse) {
      return formatHumanResponse(ctx.humanResponse);
    }

    const text = message.text.trim().toLowerCase();

    if (text.includes('multi-approve')) {
      const to = (process.env.NEXT_PUBLIC_HITL_SENT_TO ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      ctx.approve('Deploy v2.4.1 to production?', to.length > 0 ? { to } : undefined);

      return 'Sent an approval card in this thread. Approve or deny it to continue.';
    }

    if (text.includes('custom-chrome-approve')) {
      ctx.approve({
        card: {
          title: 'Deploy v2.4.1 to production?',
          subtitle: 'From Deployment Agent',
          body: 'This is a custom chrome approval card.',
          approveLabel: 'Yes',
          denyLabel: 'No',
        },
        ttlSeconds: 10,
      });

      return 'Sent a custom chrome approval card in this thread. Approve or deny it to continue.';
    }

    if (text.includes('custom-approve')) {
      ctx.approve({
        render: ({ actionIds }) => {
          return Card({
            title: 'Deploy v2.4.1 to production?',
            subtitle: 'From Deployment Agent',
            children: [
              Actions([
                Button({ label: 'Yes', id: actionIds.approve, actionType: 'action', style: 'primary' }),
                Button({ label: 'No', id: actionIds.deny, actionType: 'action' }),
              ]),
            ],
          });
        },
        ttlSeconds: 10,
      });

      return 'Sent a custom approval card in this thread. Approve or deny it to continue.';
    }

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

    if (text.includes('tool-approval')) {
      ctx.toolApproval.request({ id: 'call_1', name: 'issueRefund', input: { orderId: 'A-123' } }, { ttlSeconds: 10 });

      return 'Sent a tool approval card in this thread. Approve or deny it to continue.';
    }

    return [
      'Framework HITL demo. Message me with one of:',
      '- `approve` — `ctx.approve("Deploy v2.4.1 to production?")`',
      '- `multi-approve` — `ctx.approve("Deploy v2.4.1 to production?", { to: ["alice", "bob"] })`',
      '- `ask` — `ctx.ask("What environment should we deploy to?")`',
      '- `choose` — `ctx.choose("Which region?", ["us-east", "eu-west", "ap-south"])`',
      '- `tell` — `ctx.tell("Deploy finished. v2.4.1 is live.")`',
      '- `tool-approval` — `ctx.toolApproval.request(...)`',
      '- `custom-approve` — `ctx.approve({ render: ({ actionIds }) => { return Card(...) })`',
      '- `custom-chrome-approve` — `ctx.approve({ card: {...} })`',
    ].join('\n');
  },
  onAction: async (_action, ctx) => {
    if (ctx.humanResponse) {
      return formatHumanResponse(ctx.humanResponse);
    }
  },

  onToolApproval: async (decision) => {
    if (decision.toolCall.id !== 'call_1') {
      return 'Action cancelled.';
    }

    // await decision.approvalMessage.delete();
    if (!decision.approved) return 'Action cancelled.';

    return 'Done. Refund issued.';
  },
});
