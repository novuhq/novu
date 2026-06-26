import type { ToolExecutionOptions, ToolSet } from 'ai';
import type { PlanHandle } from '../resources/agent/agent.types';

type ToolInputAvailableOptions = {
  input: unknown;
} & ToolExecutionOptions;

const SUMMARY_KEY_PRIORITY = ['query', 'command', 'path', 'action'];
const MAX_DETAIL_LENGTH = 200;

/**
 * Wrap an AI SDK `tools` map so each tool call reports progress via the plan handle.
 * Pass the result to `streamText` / `generateText` as `tools`.
 */
export function trackPlanTools<T extends ToolSet>(plan: PlanHandle, tools: T): T {
  const wrapped = {} as T;

  for (const [name, tool] of Object.entries(tools) as [keyof T & string, T[keyof T]][]) {
    const runExecute = tool.execute;
    const reportedInProgress = new Set<string>();
    const wrappedTool = {
      ...tool,
      onInputAvailable: async (options: ToolInputAvailableOptions) => {
        reportedInProgress.add(options.toolCallId);
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
        if (!reportedInProgress.has(options.toolCallId)) {
          plan.upsertTask(options.toolCallId, {
            title: name,
            status: 'in_progress',
            details: summarizePlanInput(input),
          });
        }
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

  if (keys.length === 1) {
    return truncate(String(obj[keys[0]]), MAX_DETAIL_LENGTH);
  }

  const primaryKey = keys.find((k) => SUMMARY_KEY_PRIORITY.includes(k));
  if (primaryKey) {
    return truncate(String(obj[primaryKey]), MAX_DETAIL_LENGTH);
  }

  const pairs = keys.slice(0, 3).map((k) => {
    const val = typeof obj[k] === 'string' ? obj[k] : JSON.stringify(obj[k]);

    return `${k}: ${val}`;
  });

  return truncate(pairs.join(', '), MAX_DETAIL_LENGTH);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;

  return `${str.slice(0, max - 1)}…`;
}
