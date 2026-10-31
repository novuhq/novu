import { setTimeout as sleep } from 'node:timers/promises';
import type { Client } from 'langsmith';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Run } from 'langsmith/schemas';
import type { Expectation, StepCheck } from './dataset.ts';
import type { TurnResult, WorkflowSummary } from './novu.ts';

export type TargetOutputs = {
  chatId?: string;
  workflow: WorkflowSummary | null;
  turns: (TurnResult & { prompt: string; seconds: number })[];
  /** Tool names in call order across all turns, for eyeballing in the compare view. */
  toolSequence: string[];
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
export function workflowChecks({ outputs, referenceOutputs }: EvaluatorArgs): EvaluationResult[] {
  const { workflow } = outputs as TargetOutputs;
  if (!workflow) return [score('workflow_created', false, 'no workflow'), score('task_success', false)];

  const expected = (referenceOutputs ?? {}) as Expectation;
  const results: EvaluationResult[] = [score('workflow_created', true)];

  if (expected.name) {
    results.push(
      score('name_match', workflow.name.trim().toLowerCase() === expected.name.toLowerCase(), `name: ${workflow.name}`)
    );
  }

  if (expected.stepTypes) {
    const actual = workflow.steps.map((step) => step.type);
    results.push(
      score(
        'step_types_match',
        actual.join(',') === expected.stepTypes.join(','),
        `expected [${expected.stepTypes}], got [${actual}]`
      )
    );
  }

  if (expected.critical !== undefined) {
    results.push(score('critical_match', workflow.critical === expected.critical, `critical: ${workflow.critical}`));
  }

  if (expected.tags) {
    const missing = missingFrom(workflow.tags, expected.tags);
    results.push(score('tags_match', missing.length === 0, missing.length ? `missing: ${missing}` : undefined));
  }

  if (expected.payloadKeys || expected.payloadRequired) {
    const missing = [
      ...missingFrom(workflow.payloadKeys, expected.payloadKeys ?? []),
      ...missingFrom(workflow.payloadRequired, expected.payloadRequired ?? []).map((key) => `${key} (required)`),
    ];
    results.push(score('payload_match', missing.length === 0, missing.length ? `missing: ${missing}` : undefined));
  }

  if (expected.steps) {
    const failures = expected.steps.map((check) => stepCheckFailure(workflow, check)).filter(Boolean);
    results.push(score('step_details_match', failures.length === 0, failures.join('\n') || undefined));
  }

  results.push(score('task_success', results.every((result) => result.score === 1)));

  return results;
}

/** Tool-call counts and failures as seen on the chat stream. */
export function toolUsage({ outputs }: EvaluatorArgs): EvaluationResult[] {
  const { turns = [], error } = outputs as TargetOutputs;
  const calls = turns.flatMap((turn) => turn.toolCalls);
  const failed = calls.filter((call) => call.error);
  const streamErrors = turns.filter((turn) => turn.streamError).map((turn) => turn.streamError);

  return [
    { key: 'tool_calls', score: calls.length },
    {
      key: 'tool_errors',
      score: failed.length,
      comment: failed.map((call) => `${call.toolName}: ${call.error}`).join('\n') || undefined,
    },
    score('run_completed', !error && streamErrors.length === 0, error ?? (streamErrors.join('\n') || undefined)),
  ];
}

type RunWithCost = Run & { total_cost?: number | string | null };

const TRACE_POLL_ATTEMPTS = 10;
const TRACE_POLL_MS = 3000;

/** The root run of each turn of the chat; `complete` is false when not every turn's run had ended in time. */
async function findTurnTraces(client: Client, projectName: string, chatId: string, turns: number) {
  // Traces reach LangSmith asynchronously, so wait until every turn's root run has ended.
  for (let attempt = 1; ; attempt++) {
    const roots: RunWithCost[] = [];
    for await (const run of client.listRuns({
      projectName,
      isRoot: true,
      filter: `and(eq(metadata_key, "thread_id"), eq(metadata_value, "${chatId}"))`,
    })) {
      roots.push(run);
    }

    const complete = roots.length >= turns && roots.every((run) => run.end_time);
    if (complete || attempt === TRACE_POLL_ATTEMPTS) return { roots, complete };

    await sleep(TRACE_POLL_MS);
  }
}

/**
 * Pulls tokens, cost and LLM call count from the traces the API wrote for this chat (grouped by
 * the LangGraph `thread_id`, which is the chat id), and checks the run used the expected tools
 * via the `tools:direct` / `tools:mcp` tag. A `variant_check` of 0 means the API was not
 * started with the flag you think it was, or fell back to direct tools.
 */
export function apiTraceMetrics(client: Client, projectName: string, variant: 'direct' | 'mcp') {
  return async function apiTrace({ outputs }: EvaluatorArgs): Promise<EvaluationResult[]> {
    const { chatId, turns = [] } = outputs as TargetOutputs;
    if (!chatId) return [score('variant_check', false, 'no chat id')];

    const { roots, complete } = await findTurnTraces(client, projectName, chatId, turns.length);
    if (roots.length === 0) return [score('variant_check', false, `no API traces in project ${projectName}`)];

    let llmCalls = 0;
    for (const root of roots) {
      for await (const _ of client.listRuns({ projectName, traceId: root.trace_id, runType: 'llm' })) llmCalls++;
    }

    const sum = (pick: (run: RunWithCost) => unknown) => roots.reduce((total, run) => total + Number(pick(run) ?? 0), 0);
    const partial = complete
      ? undefined
      : `partial: only ${roots.filter((run) => run.end_time).length} of ${turns.length} turn traces had ended`;
    const metric = (key: string, value: number): EvaluationResult => ({ key, score: value, comment: partial });
    const expectedTag = `tools:${variant}`;
    const wrongVariant = roots.filter((run) => !run.tags?.includes(expectedTag));

    return [
      score(
        'variant_check',
        wrongVariant.length === 0,
        wrongVariant.length ? `${wrongVariant.length} turn(s) missing ${expectedTag}: ${wrongVariant[0].tags}` : undefined
      ),
      metric('llm_calls', llmCalls),
      metric('total_tokens', sum((run) => run.total_tokens)),
      metric('prompt_tokens', sum((run) => run.prompt_tokens)),
      metric('completion_tokens', sum((run) => run.completion_tokens)),
      metric('total_cost', sum((run) => run.total_cost)),
    ];
  };
}
