import { describe, expect, it } from 'vitest';
import type { GraderOutcome, GraderResult, RunResult } from '../../core/types.js';
import { graderToJudge } from './adapters.js';
import { catalog } from './catalog.js';
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

function status(outcome: GraderResult | GraderOutcome): GraderResult {
  return typeof outcome === 'string' ? outcome : outcome.status;
}

describe('sendblue catalog graders', () => {
  const connectCommand =
    'npx novu@latest connect "Cellar concierge" --ci --keyless --channel sendblue ' +
    '--sendblue-api-key "$SENDBLUE_API_KEY" --sendblue-secret-key "$SENDBLUE_SECRET_KEY" ' +
    "--sendblue-from '+14155550100' --sendblue-test-phone '+14155550123'";

  it('passes sendblueFlagsPresent when all four flags are present', () => {
    const result = buildResult({ trackedCommands: [connectCommand] });

    expect(status(catalog.sendblueFlagsPresent(result))).toBe('pass');
  });

  it('fails sendblueFlagsPresent when a flag is missing', () => {
    const result = buildResult({
      trackedCommands: [connectCommand.replace("--sendblue-test-phone '+14155550123'", '')],
    });

    expect(status(catalog.sendblueFlagsPresent(result))).toBe('fail');
  });

  it('passes sendblueNumbersDistinct when from/test-phone map correctly', () => {
    const result = buildResult({
      metadata: { sendblueFrom: '+14155550100', sendblueTestPhone: '+14155550123' },
    });

    expect(status(catalog.sendblueNumbersDistinct('+14155550100', '+14155550123')(result))).toBe('pass');
  });

  it('fails sendblueNumbersDistinct when the two numbers are swapped', () => {
    const result = buildResult({
      metadata: { sendblueFrom: '+14155550123', sendblueTestPhone: '+14155550100' },
    });

    expect(status(catalog.sendblueNumbersDistinct('+14155550100', '+14155550123')(result))).toBe('fail');
  });
});

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
