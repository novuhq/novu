import { createJudge, type Judge } from 'vitest-evals';
import type { GraderDefinition, GraderOutcome, GraderResult, RunResult } from '../../core/types.js';

function toOutcome(value: GraderResult | GraderOutcome): GraderOutcome {
  return typeof value === 'string' ? { status: value } : value;
}

function outcomeToScore(outcome: GraderOutcome): number {
  if (outcome.status === 'skip') {
    return 1;
  }

  return outcome.status === 'pass' ? 1 : 0;
}

export function graderToJudge(name: string, definition: GraderDefinition): Judge {
  return createJudge(definition.label ?? name, async ({ output }) => {
    const outcome = toOutcome(await definition.run(output as RunResult));

    return {
      score: outcomeToScore(outcome),
      metadata: outcome.reason ? { rationale: outcome.reason, status: outcome.status } : { status: outcome.status },
    };
  });
}

export function gradersToJudges(
  graders: Record<string, GraderDefinition>,
  options: { judgeEnabled: boolean }
): Judge[] {
  const judges: Judge[] = [];

  for (const [name, definition] of Object.entries(graders)) {
    if (definition.kind === 'judge' && !options.judgeEnabled) {
      continue;
    }

    judges.push(graderToJudge(name, definition));
  }

  return judges;
}

export function isJudgeEnabled(): boolean {
  return process.env.NOVU_EVAL_JUDGE === 'true' || process.env.NOVU_EVAL_JUDGE === '1';
}
