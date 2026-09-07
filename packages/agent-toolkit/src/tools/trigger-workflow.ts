import { z } from 'zod';
import { NovuTool } from '../core/novu-tool.js';

export const triggerWorkflow = NovuTool({
  method: 'trigger_workflow',
  name: 'Trigger workflow',
  description:
    'Triggers a Novu notification workflow by its identifier. Use this to send notifications to a subscriber via any configured channel (email, SMS, push, in-app, chat). Returns a transactionId that can be used to track the notification.',
  parameters: z.object({
    workflowId: z.string().describe('The identifier of the workflow to trigger.'),
    payload: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Additional data to pass to the workflow for rendering notification content.'),
    overrides: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Provider-specific configuration overrides.'),
    subscriberId: z
      .string()
      .optional()
      .describe('The subscriber ID to send the notification to. Defaults to the configured subscriberId.'),
    transactionId: z
      .string()
      .optional()
      .describe('Optional unique identifier for deduplication. If the same transactionId is sent again, the trigger is ignored.'),
  }),
  execute: (client, config) => async (params) => {
    const { workflowId, payload, overrides, subscriberId, transactionId } = params as {
      workflowId: string;
      payload?: Record<string, unknown>;
      overrides?: Record<string, unknown>;
      subscriberId?: string;
      transactionId?: string;
    };

    const response = await client.trigger({
      workflowId,
      to: subscriberId ?? config.subscriberId,
      payload,
      overrides: overrides as never,
      transactionId,
    });

    return {
      transactionId: response.result.transactionId,
      acknowledged: response.result.acknowledged,
      status: response.result.status,
    };
  },
});
