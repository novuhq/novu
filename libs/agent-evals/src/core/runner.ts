import fs from 'node:fs/promises';
import path from 'node:path';
import { gradeRun, scoreFromOutcomes } from './graders.js';
import { configureJudge } from './judge.js';
import { dryRunAgentScenario, runAgentScenario } from './run-agent.js';
import type { RegisteredScenario, RunnerOptions, ScenarioScore, Suite } from './types.js';
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

  const runResult = options.dry
    ? await dryRunAgentScenario(entry.scenario)
    : await runAgentScenario({ suite, scenario: entry.scenario, model: options.model });

  const graders = options.dry
    ? Object.fromEntries(Object.keys(entry.graders).map((name) => [name, 'skip' as const]))
    : await gradeRun(entry.graders, runResult, { judgeEnabled: options.judge });

  const score = options.dry ? 1 : scoreFromOutcomes(graders);

  const scenarioScore: ScenarioScore = {
    scenarioId: entry.scenario.id,
    category: entry.scenario.category,
    model: options.model,
    score,
    graders,
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

  for (const entry of selected) {
    scores.push(await runEvaluation(suite, entry, options));
  }

  return scores;
}

export function averageScore(scores: ScenarioScore[]): number {
  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, item) => sum + item.score, 0) / scores.length;
}
