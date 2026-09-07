import type { DeferredToolCall, HumanDecision } from '@novu/agent-toolkit/ai-sdk';
import { createNovuAgentToolkit } from '@novu/agent-toolkit/ai-sdk';
import { type ToolSet, tool } from 'ai';
import { z } from 'zod';

export type PendingApproval = {
  id: string;
  toolCall: DeferredToolCall;
  createdAt: string;
  result?: unknown;
  decision?: HumanDecision;
};

export const pendingApprovals = new Map<string, PendingApproval>();

let toolkitPromise: ReturnType<typeof createNovuAgentToolkit> | null = null;

const refundSchema = z.object({
  orderId: z.string().describe('The order ID to refund.'),
  amount: z.number().describe('The refund amount in USD.'),
  reason: z.string().describe('The reason for the refund.'),
});

function buildIssueRefundTool() {
  return tool({
    description: 'Issue a refund to a customer for a specific order.',
    inputSchema: refundSchema,
    execute: async (args: z.infer<typeof refundSchema>) => {
      return {
        status: 'refunded',
        orderId: args.orderId,
        amount: args.amount,
        reason: args.reason,
        refundId: `REF-${Date.now()}`,
        processedAt: new Date().toISOString(),
      };
    },
  });
}

export async function getToolkit() {
  if (!toolkitPromise) {
    toolkitPromise = createNovuAgentToolkit({
      backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'https://dev.api.novu.co',
      secretKey: process.env.NOVU_SECRET_KEY ?? 'dummy-key',
      subscriberId: process.env.NOVU_SUBSCRIBER_ID ?? 'demo-subscriber',
      workflows: {
        tags: ['agent', 'test'],
      },
    });
  }

  return toolkitPromise;
}

export async function buildRefundTools(): Promise<ToolSet> {
  const toolkit = await getToolkit();

  const issueRefund = buildIssueRefundTool();

  const guarded = toolkit.requireHumanInput(
    { issue_refund: issueRefund as ToolSet[string] },
    {
      workflowId: process.env.NOVU_HITL_WORKFLOW_ID ?? 'refund-approval',
      subscribers: [process.env.NOVU_SUBSCRIBER_ID ?? 'demo-subscriber'],
      allowedDecisions: ['approve', 'edit', 'reject'],
      onBeforeTrigger: async (toolCall: DeferredToolCall) => {
        pendingApprovals.set(toolCall.id, {
          id: toolCall.id,
          toolCall,
          createdAt: new Date().toISOString(),
        });
      },
    }
  );

  return guarded;
}

export async function resolveApproval(
  toolCallId: string,
  decision: HumanDecision
): Promise<{ result: unknown } | null> {
  const pending = pendingApprovals.get(toolCallId);
  if (!pending) return null;

  const toolkit = await getToolkit();

  const result = await toolkit.resumeToolExecution(pending.toolCall, decision);

  pendingApprovals.set(toolCallId, {
    ...pending,
    decision,
    result,
  });

  return { result };
}
