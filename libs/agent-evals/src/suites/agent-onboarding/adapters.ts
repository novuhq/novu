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

export function gradersToJudges(graders: Record<string, GraderDefinition>): Judge[] {
  return Object.entries(graders).map(([name, definition]) => graderToJudge(name, definition));
}
