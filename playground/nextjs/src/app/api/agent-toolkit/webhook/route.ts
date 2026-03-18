import { handleWebhookEvent } from '@novu/agent-toolkit/human-in-the-loop';
import type { HumanDecision, WebhookEvent } from '@novu/agent-toolkit/human-in-the-loop';
import { pendingApprovals, resolveApproval } from '../lib/toolkit';

type SimulatedApproval = {
  toolCallId: string;
  decision: HumanDecision;
};

export async function POST(req: Request) {
  const body = await req.json();

  let toolCallId: string | null = null;
  let decision: HumanDecision | null = null;

  if (body.toolCallId && body.decision) {
    const simulated = body as SimulatedApproval;
    toolCallId = simulated.toolCallId;
    decision = simulated.decision;
  } else {
    const interaction = handleWebhookEvent(body as WebhookEvent);
    if (!interaction) {
      return Response.json({ ok: false, error: 'Unrecognized event' }, { status: 400 });
    }
    toolCallId = interaction.toolCall.id;
    decision = interaction.decision;
  }

  if (!toolCallId || !decision) {
    return Response.json({ ok: false, error: 'Missing toolCallId or decision' }, { status: 400 });
  }

  if (!pendingApprovals.has(toolCallId)) {
    return Response.json({ ok: false, error: 'No pending approval found for this tool call' }, { status: 404 });
  }

  const resolved = await resolveApproval(toolCallId, decision);

  if (!resolved) {
    return Response.json({ ok: false, error: 'Failed to resolve approval' }, { status: 500 });
  }

  return Response.json({ ok: true, result: resolved.result });
}
