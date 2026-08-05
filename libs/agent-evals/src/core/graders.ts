import { runJudge } from './judge.js';
import type { GraderDefinition, GraderFn, GraderOutcome, RunResult, ToolCallRecord } from './types.js';

/** Helper for graders that want to explain a failure inline. */
export function fail(reason: string): GraderOutcome {
  return { status: 'fail', reason };
}

export function labeled(label: string, input: GraderFn | GraderDefinition): GraderDefinition {
  if (typeof input === 'function') {
    return { kind: 'deterministic', run: input, label };
  }

  return { ...input, label };
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
  // The recorder mirrors the last assistant turn into `finalText`, so appending it again
  // would duplicate that turn in judge prompts and regex-match contexts. Only include
  // `finalText` when it is not already the last recorded message.
  const messages = [...result.assistantMessages];

  if (result.finalText && messages[messages.length - 1] !== result.finalText) {
    messages.push(result.finalText);
  }

  return messages.join('\n');
}

export function judge(prompt: string, context: (result: RunResult) => string): GraderDefinition {
  return {
    kind: 'judge',
    run: async (result) => runJudge(prompt, context(result)),
  };
}
