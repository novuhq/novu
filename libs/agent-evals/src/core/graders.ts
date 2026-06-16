import type { GraderDefinition, GraderFn, GraderResult, RunResult, ToolCallRecord } from './types.js';

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
    run: async (result) => {
      const { runJudge } = await import('./judge.js');

      return runJudge(prompt, context(result));
    },
  };
}

export async function gradeRun(
  graders: Record<string, GraderDefinition>,
  result: RunResult,
  options: { judgeEnabled: boolean }
): Promise<Record<string, GraderResult>> {
  const outcomes: Record<string, GraderResult> = {};

  for (const [name, definition] of Object.entries(graders)) {
    if (definition.kind === 'judge' && !options.judgeEnabled) {
      outcomes[name] = 'skip';
      continue;
    }

    outcomes[name] = await definition.run(result);
  }

  return outcomes;
}

export function scoreFromOutcomes(outcomes: Record<string, GraderResult>): number {
  const considered = Object.values(outcomes).filter((value) => value !== 'skip');
  const passed = considered.filter((value) => value === 'pass').length;

  if (considered.length === 0) {
    return 0;
  }

  return passed / considered.length;
}
