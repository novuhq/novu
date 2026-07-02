import type { InternalPlanHandle } from './plan-handle';

/** AI SDK tool hooks wrapped by plan tracking — internal to this module. */
type PlanTrackedTool = {
  execute?: (input: unknown, options: { toolCallId: string }) => Promise<unknown>;
  onInputAvailable?: (options: { input: unknown; toolCallId: string }) => Promise<void>;
};

/**
 * Wrap a tools map so each call reports progress on the turn's plan card.
 * Used by `ctx.plan.track(tools)`.
 */
export function wrapToolsWithPlan<T>(getPlan: () => InternalPlanHandle, tools: T): T {
  if (typeof tools !== 'object' || tools === null) {
    return tools;
  }

  const wrapped = { ...tools } as T;

  for (const [name, tool] of Object.entries(tools as Record<string, unknown>)) {
    if (typeof tool !== 'object' || tool === null) {
      continue;
    }

    const source = tool as PlanTrackedTool;
    const runExecute = source.execute;
    const reportedInProgress = new Set<string>();
    const wrappedTool: PlanTrackedTool = {
      ...source,
      onInputAvailable: async (options) => {
        reportedInProgress.add(options.toolCallId);
        getPlan().upsertTask(options.toolCallId, {
          title: name,
          status: 'in_progress',
          details: summarizePlanInput(options.input),
        });
        await source.onInputAvailable?.(options);
      },
    };

    if (typeof runExecute === 'function') {
      wrappedTool.execute = async (input, options) => {
        if (!reportedInProgress.has(options.toolCallId)) {
          getPlan().upsertTask(options.toolCallId, {
            title: name,
            status: 'in_progress',
            details: summarizePlanInput(input),
          });
        }
        try {
          const out = await runExecute(input, options);
          getPlan().upsertTask(options.toolCallId, { status: 'complete' });

          return out;
        } catch (err) {
          getPlan().upsertTask(options.toolCallId, {
            status: 'error',
            details: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      };
    }

    (wrapped as Record<string, PlanTrackedTool>)[name] = wrappedTool;
  }

  return wrapped;
}

const SUMMARY_KEY_PRIORITY = ['query', 'command', 'path', 'action'];
const MAX_DETAIL_LENGTH = 200;

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
