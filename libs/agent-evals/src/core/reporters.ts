import fs from 'node:fs/promises';
import path from 'node:path';
import { formatGraderStatus } from './graders.js';
import type { GraderDefinition, GraderOutcome, ScenarioScore } from './types.js';
import { PACKAGE_ROOT } from './types.js';

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

type GraderProgressReporterOptions = {
  totalGraders: number;
  judgeEnabled: boolean;
};

export function createGraderProgressReporter(options: GraderProgressReporterOptions) {
  let graderIndex = 0;
  let pendingJudgeLineLength = 0;

  const formatGraderLine = (
    index: number,
    name: string,
    status: string,
    kind: GraderDefinition['kind'],
    reason?: string
  ) => {
    const base = `      • [${index}/${options.totalGraders}] ${name}: ${formatGraderStatus(status, kind, options.judgeEnabled)}`;

    return status === 'fail' && reason ? `${base} — ${reason}` : base;
  };

  return {
    onGraderStart(name: string, kind: GraderDefinition['kind']) {
      if (kind !== 'judge' || !process.stdout.isTTY) {
        return;
      }

      graderIndex += 1;
      const line = formatGraderLine(graderIndex, name, 'evaluating…', kind);
      pendingJudgeLineLength = line.length;
      process.stdout.write(line);
    },
    onGraderResult(name: string, outcome: GraderOutcome, kind: GraderDefinition['kind']) {
      if (kind === 'judge' && process.stdout.isTTY && pendingJudgeLineLength > 0) {
        const line = formatGraderLine(graderIndex, name, outcome.status, kind, outcome.reason);
        const padding = Math.max(0, pendingJudgeLineLength - line.length);
        process.stdout.write(`\r${line}${' '.repeat(padding)}\n`);
        pendingJudgeLineLength = 0;

        return;
      }

      graderIndex += 1;
      console.log(formatGraderLine(graderIndex, name, outcome.status, kind, outcome.reason));
    },
  };
}
