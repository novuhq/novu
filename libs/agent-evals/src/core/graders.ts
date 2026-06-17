import { runJudge } from './judge.js';
import type { GraderDefinition, GraderFn, GraderOutcome, GraderResult, RunResult, ToolCallRecord } from './types.js';

/** Helper for graders that want to explain a failure inline. */
export function fail(reason: string): GraderOutcome {
  return { status: 'fail', reason };
}

function toOutcome(value: GraderResult | GraderOutcome): GraderOutcome {
  return typeof value === 'string' ? { status: value } : value;
}

export function defineGraders<T extends Record<string, GraderFn | GraderDefinition>>(
  graders: T
): Record<keyof T, GraderDefinition> {
  const normalized = {} as Record<keyof T, GraderDefinition>;

  for (const [name, value] of Object.entries(graders) as Array<[keyof T, GraderFn | GraderDefinition]>) {
    if (typeof value === 'function') {
      normalized[name] = { kind: 'deterministic', run: value };
    } else {
      normalized[name] = value;
    }
  }

  return normalized;
}

export function contains(substring: string, source: (result: RunResult) => string): GraderFn {
  return (result) => (source(result).toLowerCase().includes(substring.toLowerCase()) ? 'pass' : 'fail');
}

export function notContains(substring: string, source: (result: RunResult) => string): GraderFn {
  return (result) => (!source(result).toLowerCase().includes(substring.toLowerCase()) ? 'pass' : 'fail');
}

export function containsAny(substrings: string[], source: (result: RunResult) => string): GraderFn {
  return (result) => {
    const haystack = source(result).toLowerCase();

    return substrings.some((item) => haystack.includes(item.toLowerCase())) ? 'pass' : 'fail';
  };
}

export function matches(pattern: RegExp, source: (result: RunResult) => string): GraderFn {
  return (result) => (pattern.test(source(result)) ? 'pass' : 'fail');
}

export function toolCallsNamed(result: RunResult, name: string): ToolCallRecord[] {
  return result.toolCalls.filter((call) => call.name === name);
}

export function transcriptText(result: RunResult): string {
  return [result.finalText, ...result.assistantMessages].join('\n');
}

export function judge(prompt: string, context: (result: RunResult) => string): GraderDefinition {
  return {
    kind: 'judge',
    run: async (result) => runJudge(prompt, context(result)),
  };
}

export type GradeRunOptions = {
  judgeEnabled: boolean;
  onGraderStart?: (name: string, kind: GraderDefinition['kind']) => void;
  onGraderResult?: (name: string, outcome: GraderOutcome, kind: GraderDefinition['kind']) => void;
};

export async function gradeRun(
  graders: Record<string, GraderDefinition>,
  result: RunResult,
  options: GradeRunOptions
): Promise<Record<string, GraderOutcome>> {
  const outcomes: Record<string, GraderOutcome> = {};
  const entries = Object.entries(graders);

  for (const [name, definition] of entries) {
    if (definition.kind === 'judge' && !options.judgeEnabled) {
      outcomes[name] = { status: 'skip' };
      options.onGraderResult?.(name, outcomes[name], definition.kind);
      continue;
    }

    options.onGraderStart?.(name, definition.kind);
    outcomes[name] = toOutcome(await definition.run(result));
    options.onGraderResult?.(name, outcomes[name], definition.kind);
  }

  return outcomes;
}

export function formatGraderStatus(status: string, kind: GraderDefinition['kind'], judgeEnabled: boolean): string {
  const isJudgeGrader = kind === 'judge';

  if (status.toUpperCase() === 'SKIP' && isJudgeGrader && !judgeEnabled) {
    return 'SKIP (judge disabled)';
  }

  if (isJudgeGrader && judgeEnabled) {
    const label = status === 'evaluating…' ? 'evaluating…' : status.toUpperCase();

    return `${label} (judge)`;
  }

  return status === 'evaluating…' ? 'evaluating…' : status.toUpperCase();
}

export function scoreFromOutcomes(outcomes: Record<string, GraderOutcome>): number {
  const considered = Object.values(outcomes).filter((value) => value.status !== 'skip');
  const passed = considered.filter((value) => value.status === 'pass').length;

  if (considered.length === 0) {
    return 0;
  }

  return passed / considered.length;
}
