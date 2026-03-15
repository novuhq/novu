import { z } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import type { Novu } from '@novu/api';
import { NovuTool } from '../core/novu-tool.js';
import type { NovuToolDefinition, NovuToolkitConfig } from '../core/types.js';

type WorkflowSummary = {
  workflowId: string;
  name: string;
  description?: string | null;
  payloadSchema?: Record<string, unknown> | null;
};

function buildPayloadSchema(payloadSchema?: Record<string, unknown> | null): z.ZodTypeAny {
  if (!payloadSchema) {
    return z.record(z.string(), z.unknown()).optional().describe('Payload data to pass to the workflow.');
  }

  try {
    const zodCode = jsonSchemaToZod(payloadSchema as object);
    // Using Function constructor to avoid bundler warnings about direct eval
    // This is intentional: we need to dynamically evaluate generated Zod schema code
    // from the workflow's JSON Schema definition at runtime.
    const schema = new Function('z', `return ${zodCode}`)(z) as z.ZodTypeAny;

    return schema.describe('Payload data to pass to the workflow.');
  } catch {
    return z.record(z.string(), z.unknown()).optional().describe('Payload data to pass to the workflow.');
  }
}

function workflowAsTool(workflow: WorkflowSummary): NovuToolDefinition {
  const methodName = `trigger_${workflow.workflowId.replace(/-/g, '_')}`;
  const payloadSchema = buildPayloadSchema(workflow.payloadSchema);

  return NovuTool({
    method: methodName,
    name: `Trigger ${workflow.name}`,
    description: [
      `Triggers the "${workflow.name}" workflow (ID: ${workflow.workflowId}).`,
      `Use this tool when asked to notify, send, or trigger "${workflow.name}" or "${workflow.workflowId}".`,
      workflow.description ? `Additional context: ${workflow.description}` : '',
      `Returns a transactionId that can be used to track the notification.`,
    ]
      .filter(Boolean)
      .join(' '),
    parameters: z.object({
      payload: payloadSchema,
      subscriberId: z
        .string()
        .optional()
        .describe('The subscriber to notify. Defaults to the configured subscriberId.'),
      transactionId: z
        .string()
        .optional()
        .describe('Optional deduplication key. Duplicate transactionIds are ignored.'),
    }),
    execute: (client, config) => async (params) => {
      const { payload, subscriberId, transactionId } = params as {
        payload?: Record<string, unknown>;
        subscriberId?: string;
        transactionId?: string;
      };

      const response = await client.trigger({
        workflowId: workflow.workflowId,
        to: subscriberId ?? config.subscriberId,
        payload,
        transactionId,
      });

      return {
        transactionId: response.result.transactionId,
        acknowledged: response.result.acknowledged,
        status: response.result.status,
      };
    },
  });
}

export async function createWorkflowTools(
  client: Novu,
  config: NovuToolkitConfig,
): Promise<NovuToolDefinition[]> {
  const { tags, workflowIds } = config.workflows ?? {};

  const listResponse = await client.workflows.list({ tags });
  const workflows = listResponse.result.workflows ?? [];

  const filtered = workflowIds
    ? workflows.filter((w) => workflowIds.includes(w.workflowId))
    : workflows;

  const tools: NovuToolDefinition[] = [];

  for (const summary of filtered) {
    let payloadSchema: Record<string, unknown> | null = null;

    try {
      const detail = await client.workflows.get(summary.workflowId);
      payloadSchema = (detail.result.payloadSchema as Record<string, unknown>) ?? null;
    } catch {
      // continue without schema
    }

    tools.push(
      workflowAsTool({
        workflowId: summary.workflowId,
        name: summary.name,
        description: undefined,
        payloadSchema,
      }),
    );
  }

  return tools;
}
