import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { GraderOutcome, GraderResult, RunResult } from '../../core/types.js';
import { graderToJudge } from './adapters.js';
import { catalog } from './catalog.js';
import { graders as keylessTeamsGraders } from './scenarios/keyless-teams-redirect/graders.js';

const wiringFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-evals-wiring-'));

afterAll(() => {
  fs.rmSync(wiringFixtureRoot, { recursive: true, force: true });
});

function buildResult(partial: Partial<RunResult>): RunResult {
  return {
    scenarioId: partial.scenarioId ?? 'test',
    userPrompt: partial.userPrompt ?? 'Connect WhatsApp',
    projectRoot: partial.projectRoot ?? '',
    toolCalls: partial.toolCalls ?? [],
    assistantMessages: partial.assistantMessages ?? [],
    finalText: partial.finalText ?? '',
    capturedUrls: partial.capturedUrls ?? [],
    openedFiles: partial.openedFiles ?? [],
    writtenFiles: partial.writtenFiles ?? [],
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

describe('bridge catalog graders', () => {
  it('passes usedRuntime when --runtime matches', () => {
    const result = buildResult({
      trackedCommands: ['npx novu connect --ci --runtime langchain --channel slack'],
    });

    expect(status(catalog.usedRuntime('langchain')(result))).toBe('pass');
    expect(status(catalog.usedRuntime('ai-sdk')(result))).toBe('fail');
  });

  it('passes usedLlmAuth when --llm-auth matches', () => {
    const result = buildResult({
      trackedCommands: ['npx novu connect --ci --runtime ai-sdk --llm-auth openai --channel slack'],
    });

    expect(status(catalog.usedLlmAuth('openai')(result))).toBe('pass');
  });

  it('passes usedDemoEchoLlmAuth when --llm-auth is omitted or skip', () => {
    expect(
      status(
        catalog.usedDemoEchoLlmAuth(
          buildResult({ trackedCommands: ['npx novu connect --ci --runtime langchain --channel slack'] })
        )
      )
    ).toBe('pass');
    expect(
      status(
        catalog.usedDemoEchoLlmAuth(
          buildResult({
            trackedCommands: ['npx novu connect --ci --runtime langchain --llm-auth skip --channel slack'],
          })
        )
      )
    ).toBe('pass');
    expect(
      status(
        catalog.usedDemoEchoLlmAuth(
          buildResult({
            trackedCommands: ['npx novu connect --ci --runtime langchain --llm-auth openai --channel slack'],
          })
        )
      )
    ).toBe('fail');
  });

  it('passes wroteBridgeWiring when Write covers route + agent', () => {
    const routePath = 'app/api/novu/route.ts';
    const agentPath = 'app/novu/agents/acme-agent-1.tsx';
    fs.mkdirSync(path.join(wiringFixtureRoot, 'app/api/novu'), { recursive: true });
    fs.mkdirSync(path.join(wiringFixtureRoot, 'app/novu/agents'), { recursive: true });
    fs.writeFileSync(
      path.join(wiringFixtureRoot, routePath),
      "import { serve } from '@novu/framework/next';\nexport const { GET, POST } = serve({ agents: [] });"
    );
    fs.writeFileSync(
      path.join(wiringFixtureRoot, agentPath),
      "import { agent } from '@novu/framework/ai-sdk';\nexport const a = agent('acme-agent-1', {});"
    );

    const result = buildResult({
      projectRoot: wiringFixtureRoot,
      writtenFiles: [routePath, agentPath],
      toolCalls: [
        { name: 'Write', args: { file_path: routePath }, timestamp: Date.now() },
        { name: 'Write', args: { file_path: agentPath }, timestamp: Date.now() },
      ],
    });

    expect(status(catalog.wroteBridgeWiring({ runtime: 'ai-sdk', agentId: 'acme-agent-1' })(result))).toBe('pass');
  });

  it('fails wroteBridgeWiring when Write is missing', () => {
    const result = buildResult({ toolCalls: [], projectRoot: wiringFixtureRoot });

    expect(status(catalog.wroteBridgeWiring({ runtime: 'ai-sdk', agentId: 'acme-agent-1' })(result))).toBe('fail');
  });
});

describe('keyless-teams-redirect graders', () => {
  it('scores a passing synthetic run at 1.0', async () => {
    const passing = buildResult({
      scenarioId: 'keyless-teams-redirect',
      finalText: 'Please continue in https://dashboard.novu.co',
      trackedCommands: [],
      toolCalls: [{ name: 'AskUserQuestion', args: {}, timestamp: Date.now() }],
    });

    const score = await averageScore(keylessTeamsGraders, passing);

    expect(score).toBe(1);
  });

  it('scores a failing synthetic run below 1.0', async () => {
    const failing = buildResult({
      scenarioId: 'keyless-teams-redirect',
      finalText: 'Running connect now',
      trackedCommands: ['npx novu connect --ci --channel teams'],
    });

    const score = await averageScore(keylessTeamsGraders, failing);

    expect(score).toBeLessThan(1);
  });
});
