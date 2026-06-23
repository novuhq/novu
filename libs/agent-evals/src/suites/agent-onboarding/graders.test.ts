import { describe, expect, it } from 'vitest';
import type { RunResult } from '../../core/types.js';
import { graderToJudge } from './adapters.js';
import { graders as keylessWhatsappGraders } from './scenarios/keyless-whatsapp-redirect/graders.js';

function buildResult(partial: Partial<RunResult>): RunResult {
  return {
    scenarioId: partial.scenarioId ?? 'test',
    userPrompt: partial.userPrompt ?? 'Connect WhatsApp',
    toolCalls: partial.toolCalls ?? [],
    assistantMessages: partial.assistantMessages ?? [],
    finalText: partial.finalText ?? '',
    capturedUrls: partial.capturedUrls ?? [],
    openedFiles: partial.openedFiles ?? [],
    killedShellIds: partial.killedShellIds ?? [],
    trackedShellIds: partial.trackedShellIds ?? [],
    polledShellIds: partial.polledShellIds ?? [],
    trackedCommands: partial.trackedCommands ?? [],
    metadata: partial.metadata ?? {},
  };
}

async function averageScore(
  graders: Record<string, { run: (result: RunResult) => unknown }>,
  result: RunResult
): Promise<number> {
  const judges = Object.entries(graders).map(([name, definition]) => graderToJudge(name, definition));
  const scores = await Promise.all(
    judges.map(async (judge) => {
      const verdict = await judge.assess({ output: result } as never);

      return verdict.score;
    })
  );

  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

describe('keyless-whatsapp-redirect graders', () => {
  it('scores a passing synthetic run at 1.0', async () => {
    const passing = buildResult({
      scenarioId: 'keyless-whatsapp-redirect',
      finalText: 'Please continue in https://dashboard.novu.co',
      trackedCommands: [],
      toolCalls: [{ name: 'AskUserQuestion', args: {}, timestamp: Date.now() }],
    });

    const score = await averageScore(keylessWhatsappGraders, passing);

    expect(score).toBe(1);
  });

  it('scores a failing synthetic run below 1.0', async () => {
    const failing = buildResult({
      scenarioId: 'keyless-whatsapp-redirect',
      finalText: 'Running connect now',
      trackedCommands: ['npx novu connect --ci --channel whatsapp'],
    });

    const score = await averageScore(keylessWhatsappGraders, failing);

    expect(score).toBeLessThan(1);
  });
});
