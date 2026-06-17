import fs from 'node:fs/promises';
import path from 'node:path';
import { gradeRun, scoreFromOutcomes } from './graders.js';
import { configureJudge } from './judge.js';
import { createGraderProgressReporter } from './reporters.js';
import { runAgentScenario } from './run-agent.js';
import type { GraderOutcome, GraderResult, RegisteredScenario, RunnerOptions, ScenarioScore, Suite } from './types.js';
import { PACKAGE_ROOT } from './types.js';

export function filterScenarios(suite: Suite, filter?: string): RegisteredScenario[] {
  if (!filter) {
    return suite.scenarios;
  }

  const normalized = filter.toLowerCase();

  return suite.scenarios.filter(
    (entry) =>
      entry.scenario.id.toLowerCase().includes(normalized) || entry.scenario.category.toLowerCase().includes(normalized)
  );
}

async function maybeWriteDebugArtifact(
  suite: Suite,
  options: RunnerOptions,
  entry: RegisteredScenario,
  score: ScenarioScore
): Promise<void> {
  if (!options.debug) {
    return;
  }

  const debugDir = path.join(PACKAGE_ROOT, 'debug-runs', suite.id, entry.scenario.id);
  await fs.mkdir(debugDir, { recursive: true });
  await fs.writeFile(path.join(debugDir, 'score.json'), JSON.stringify(score, null, 2), 'utf8');
}

export async function runEvaluation(
  suite: Suite,
  entry: RegisteredScenario,
  options: RunnerOptions
): Promise<ScenarioScore> {
  configureJudge({ enabled: options.judge, model: options.judgeModel ?? options.model });

  const runResult = await runAgentScenario({ suite, scenario: entry.scenario, model: options.model });
  const totalGraders = Object.keys(entry.graders).length;

  console.log(`    ↳ ${entry.scenario.id}: grading ${totalGraders} checks${options.judge ? ' (with judge)' : ''}…`);

  const progress = createGraderProgressReporter({ totalGraders, judgeEnabled: options.judge });
  const outcomes: Record<string, GraderOutcome> = await gradeRun(entry.graders, runResult, {
    judgeEnabled: options.judge,
    onGraderStart: progress.onGraderStart,
    onGraderResult: progress.onGraderResult,
  });

  const graders = Object.fromEntries(
    Object.entries(outcomes).map(([name, outcome]) => [name, outcome.status])
  ) as Record<string, GraderResult>;

  const graderReasons = Object.fromEntries(
    Object.entries(outcomes)
      .filter(([, outcome]) => outcome.status === 'fail' && Boolean(outcome.reason))
      .map(([name, outcome]) => [name, outcome.reason as string])
  );

  const score = scoreFromOutcomes(outcomes);

  const graderKinds = Object.fromEntries(
    Object.entries(entry.graders).map(([name, definition]) => [name, definition.kind])
  ) as Record<string, 'deterministic' | 'judge'>;

  const scenarioScore: ScenarioScore = {
    scenarioId: entry.scenario.id,
    category: entry.scenario.category,
    model: options.model,
    score,
    graders,
    graderReasons,
    graderKinds,
    runResult: options.debug ? runResult : undefined,
  };

  await maybeWriteDebugArtifact(suite, options, entry, { ...scenarioScore, runResult });

  return scenarioScore;
}

export async function runAllEvaluations(suite: Suite, options: RunnerOptions): Promise<ScenarioScore[]> {
  let selected = filterScenarios(suite, options.scenarioFilter);

  if (options.smoke) {
    selected = selected.slice(0, 1);
  }

  const scores: ScenarioScore[] = [];
  const total = selected.length;

  console.log(`Running ${total} scenario${total === 1 ? '' : 's'} for suite "${suite.id}" (model: ${options.model})\n`);

  for (let index = 0; index < selected.length; index += 1) {
    const entry = selected[index];
    const position = `[${index + 1}/${total}]`;
    const startedAt = Date.now();

    console.log(`${position} ${entry.scenario.id} — running…`);

    const score = await runEvaluation(suite, entry, options);
    scores.push(score);

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`${position} ${entry.scenario.id} — done: ${(score.score * 100).toFixed(1)}% (${elapsed}s)`);
  }

  if (total > 1) {
    console.log(`Average score: ${(averageScore(scores) * 100).toFixed(1)}%`);
  }

  console.log('');

  return scores;
}

export function averageScore(scores: ScenarioScore[]): number {
  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, item) => sum + item.score, 0) / scores.length;
}
