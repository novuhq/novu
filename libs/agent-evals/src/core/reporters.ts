import fs from 'node:fs/promises';
import path from 'node:path';
import type { ScenarioScore } from './types.js';
import { PACKAGE_ROOT } from './types.js';

function formatResult(value: 'pass' | 'fail' | 'skip'): string {
  if (value === 'pass') {
    return 'PASS';
  }

  if (value === 'fail') {
    return 'FAIL';
  }

  return 'SKIP';
}

export function printConsoleReport(suiteId: string, scores: ScenarioScore[], judgeEnabled: boolean): void {
  console.log(`\n${suiteId} eval results\n`);

  for (const score of scores) {
    console.log(`${score.scenarioId} (${score.category}) — ${(score.score * 100).toFixed(1)}%`);

    for (const [name, result] of Object.entries(score.graders)) {
      const suffix = result === 'skip' && !judgeEnabled ? ' (judge disabled)' : '';
      console.log(`  - ${name}: ${formatResult(result)}${suffix}`);
    }

    console.log('');
  }

  const average = scores.reduce((sum, item) => sum + item.score, 0) / (scores.length || 1);
  console.log(`Average score: ${(average * 100).toFixed(1)}%`);
}

export async function writeScoresFile(suiteId: string, scores: ScenarioScore[]): Promise<string> {
  const outputPath = path.join(PACKAGE_ROOT, `scores-${suiteId}.json`);
  const payload = scores.map(({ runResult, ...rest }) => ({
    ...rest,
    suite: suiteId,
    updatedAt: new Date().toISOString(),
  }));

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');

  return outputPath;
}
