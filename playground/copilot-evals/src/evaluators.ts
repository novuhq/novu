import { setTimeout as sleep } from 'node:timers/promises';
import type { Client } from 'langsmith';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Run } from 'langsmith/schemas';
import type { Expectation, StepCheck } from './dataset.ts';
import type { ToolCall, WorkflowSummary } from './novu.ts';

// langsmith accepts this shape from evaluators but does not export the type.
type EvaluationResults = { results: EvaluationResult[] };

export type TargetOutputs = {
  chatId?: string;
  workflow: WorkflowSummary | null;
  turns: { prompt: string; text: string; seconds: number; streamError?: string; toolCalls: ToolCall[] }[];
  /** Tool names in call order across all turns, for eyeballing in the compare view. */
  toolSequence: string[];
  toolCalls: number;
  toolErrors: number;
  /** Set when the run itself failed (HTTP error, timeout) rather than Copilot doing the wrong thing. */
  error?: string;
};

type EvaluatorArgs = { outputs: Record<string, any>; referenceOutputs?: Record<string, any> };

const score = (key: string, passed: boolean, comment?: string): EvaluationResult => ({
  key,
  score: passed ? 1 : 0,
  comment,
});

const lower = (value: unknown) => JSON.stringify(value ?? null).toLowerCase();

const missingFrom = (actual: string[], expected: string[]) => expected.filter((item) => !actual.includes(item));

function hasCondition(skip: unknown): boolean {
  if (skip === null || skip === undefined || skip === false) return false;

  return typeof skip !== 'object' || Object.keys(skip).length > 0;
}

/** Returns why the step fails the check, or nothing when it passes. */
function stepCheckFailure(workflow: WorkflowSummary, check: StepCheck): string | undefined {
  const nth = check.nth ?? 0;
  const step = workflow.steps.filter((candidate) => candidate.type === check.type)[nth];
  const label = `${check.type}[${nth}]`;
  if (!step) return `${label}: no such step`;

  const { controlValues } = step;
  const content = lower(controlValues);
  const missingText = (check.includes ?? []).filter((text) => !content.includes(text.toLowerCase()));
  if (missingText.length) return `${label}: missing ${missingText.join(', ')}`;

  if (
    check.controls &&
    !check.controls.some((partial) =>
      Object.entries(partial).every(([key, value]) => lower(controlValues[key]) === lower(value))
    )
  ) {
    return `${label}: controls ${content.slice(0, 200)}`;
  }

  if (check.condition !== undefined) {
    const { skip } = controlValues;
    if (check.condition === false && hasCondition(skip)) return `${label}: unexpected condition ${lower(skip)}`;
    if (check.condition !== false && !hasCondition(skip)) return `${label}: no condition`;
    if (Array.isArray(check.condition)) {
      const missing = check.condition.filter((text) => !lower(skip).includes(text.toLowerCase()));
      if (missing.length) return `${label}: condition ${lower(skip)} lacks ${missing.join(', ')}`;
    }
  }

  return undefined;
}

/**
 * Checks the workflow Copilot left behind against the example's expectation. Only the
 * expectations an example defines are scored; `task_success` is all of them passing.
 */
export function workflowChecks({ outputs, referenceOutputs }: EvaluatorArgs): EvaluationResults {
  const { workflow } = outputs as TargetOutputs;
  const expected = (referenceOutputs ?? {}) as Expectation;
  const results: EvaluationResult[] = [score('workflow_created', !!workflow, workflow ? undefined : 'no workflow')];

  if (workflow && expected.name) {
    results.push(
      score('name_match', workflow.name.trim().toLowerCase() === expected.name.toLowerCase(), `name: ${workflow.name}`)
    );
  }

  if (workflow && expected.stepTypes) {
    const actual = workflow.steps.map((step) => step.type);
    results.push(
      score(
        'step_types_match',
        actual.join(',') === expected.stepTypes.join(','),
        `expected [${expected.stepTypes}], got [${actual}]`
      )
    );
  }

  if (workflow && expected.critical !== undefined) {
    results.push(score('critical_match', workflow.critical === expected.critical, `critical: ${workflow.critical}`));
  }

  if (workflow && expected.tags) {
    const missing = missingFrom(workflow.tags, expected.tags);
    results.push(score('tags_match', missing.length === 0, missing.length ? `missing: ${missing}` : undefined));
  }

  if (workflow && (expected.payloadKeys || expected.payloadRequired)) {
    const missing = [
      ...missingFrom(workflow.payloadKeys, expected.payloadKeys ?? []),
      ...missingFrom(workflow.payloadRequired, expected.payloadRequired ?? []).map((key) => `${key} (required)`),
    ];
    results.push(score('payload_match', missing.length === 0, missing.length ? `missing: ${missing}` : undefined));
  }

  if (workflow && expected.steps) {
    const failures = expected.steps.map((check) => stepCheckFailure(workflow, check)).filter(Boolean);
    results.push(score('step_details_match', failures.length === 0, failures.join('\n') || undefined));
  }

  results.push(score('task_success', results.every((result) => result.score === 1)));

  return { results };
}

/** Tool-call counts and failures as seen on the chat stream. */
export function toolUsage({ outputs }: EvaluatorArgs): EvaluationResults {
  const { toolCalls = 0, toolErrors = 0, turns = [], error } = outputs as TargetOutputs;
  const streamErrors = turns.filter((turn) => turn.streamError).map((turn) => turn.streamError);
  const failedTools = turns.flatMap((turn) => turn.toolCalls.filter((call) => call.error));

  return {
    results: [
      { key: 'tool_calls', score: toolCalls },
      {
        key: 'tool_errors',
        score: toolErrors,
        comment: failedTools.map((call) => `${call.toolName}: ${call.error}`).join('\n') || undefined,
      },
      score('run_completed', !error && streamErrors.length === 0, error ?? (streamErrors.join('\n') || undefined)),
    ],
  };
}

type RunWithCost = Run & { total_cost?: number | string | null };

async function findTurnTraces(client: Client, projectName: string, chatId: string, turns: number) {
  let roots: RunWithCost[] = [];

  // Traces reach LangSmith asynchronously, so wait until every turn's root run has ended.
  for (let attempt = 0; attempt < 10; attempt++) {
    roots = [];
    for await (const run of client.listRuns({
      projectName,
      isRoot: true,
      filter: `and(eq(metadata_key, "thread_id"), eq(metadata_value, "${chatId}"))`,
    })) {
      roots.push(run);
    }
    if (roots.length >= turns && roots.every((run) => run.end_time)) break;
    await sleep(3000);
  }

  return roots;
}

/**
 * Pulls tokens, cost and LLM call count from the traces the API wrote for this chat (grouped by
 * the LangGraph `thread_id`, which is the chat id), and checks the run used the expected tools
 * via the `tools:direct` / `tools:mcp` tag. A `variant_check` of 0 means the API was not
 * started with the flag you think it was, or fell back to direct tools.
 */
export function apiTraceMetrics(client: Client, projectName: string, variant: 'direct' | 'mcp') {
  return async function apiTrace({ outputs }: EvaluatorArgs): Promise<EvaluationResults> {
    const { chatId, turns = [] } = outputs as TargetOutputs;
    if (!chatId) return { results: [{ key: 'variant_check', score: 0, comment: 'no chat id' }] };

    const roots = await findTurnTraces(client, projectName, chatId, turns.length);
    if (roots.length === 0) {
      return { results: [{ key: 'variant_check', score: 0, comment: `no API traces in project ${projectName}` }] };
    }

    let llmCalls = 0;
    for (const root of roots) {
      for await (const _ of client.listRuns({ projectName, traceId: root.trace_id, runType: 'llm' })) llmCalls++;
    }

    const sum = (pick: (run: RunWithCost) => unknown) => roots.reduce((total, run) => total + Number(pick(run) ?? 0), 0);
    const expectedTag = `tools:${variant}`;
    const wrongVariant = roots.filter((run) => !run.tags?.includes(expectedTag));

    return {
      results: [
        score(
          'variant_check',
          wrongVariant.length === 0,
          wrongVariant.length ? `${wrongVariant.length} turn(s) missing ${expectedTag}: ${wrongVariant[0].tags}` : undefined
        ),
        { key: 'llm_calls', score: llmCalls },
        { key: 'total_tokens', score: sum((run) => run.total_tokens) },
        { key: 'prompt_tokens', score: sum((run) => run.prompt_tokens) },
        { key: 'completion_tokens', score: sum((run) => run.completion_tokens) },
        { key: 'total_cost', score: sum((run) => run.total_cost) },
      ],
    };
  };
}
