import type { ToolExecutionOptions, ToolSet } from 'ai';
import type { PlanHandle } from '../resources/agent/agent.types';

type ToolInputAvailableOptions = {
  input: unknown;
} & ToolExecutionOptions;

/**
 * Wrap an AI SDK `tools` map so each tool call reports progress via the plan handle.
 * Pass the result to `streamText` / `generateText` as `tools`.
 */
export function trackPlanTools<T extends ToolSet>(plan: PlanHandle, tools: T): T {
  const wrapped = {} as T;

  for (const [name, tool] of Object.entries(tools) as [keyof T & string, T[keyof T]][]) {
    const runExecute = tool.execute;
    const wrappedTool = {
      ...tool,
      onInputAvailable: async (options: ToolInputAvailableOptions) => {
        plan.upsertTask(options.toolCallId, {
          title: name,
          status: 'in_progress',
          details: summarizePlanInput(options.input),
        });
        await tool.onInputAvailable?.(options);
      },
    };

    if (typeof runExecute === 'function') {
      wrappedTool.execute = async (input: unknown, options: ToolExecutionOptions) => {
        plan.upsertTask(options.toolCallId, {
          title: name,
          status: 'in_progress',
          details: summarizePlanInput(input),
        });
        try {
          const out = await runExecute(input, options);
          plan.upsertTask(options.toolCallId, { status: 'complete' });

          return out;
        } catch (err) {
          plan.upsertTask(options.toolCallId, {
            status: 'error',
            details: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      };
    }

    wrapped[name as keyof T] = wrappedTool as T[keyof T];
  }

  return wrapped;
}

function summarizePlanInput(input: unknown): string | undefined {
  if (input == null || typeof input !== 'object') return undefined;
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return undefined;
  const pairs = keys.slice(0, 3).map((k) => `${k}: ${typeof obj[k] === 'string' ? obj[k] : JSON.stringify(obj[k])}`);
  const text = pairs.join(', ');

  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}
