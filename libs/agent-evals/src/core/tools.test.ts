import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RunRecorder } from './recorder.js';
import { createHarnessContext, createHarnessTools } from './tools.js';
import type { CommandParser, EvalScenario, Suite } from './types.js';

const parser: CommandParser = { matches: () => false, parse: () => ({}) };

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-evals-read-'));
fs.writeFileSync(path.join(tmpDir, 'README.md'), 'hello world');

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeHarness() {
  const scenario: EvalScenario = {
    id: 'read-test',
    category: 'test',
    description: '',
    userPrompt: '',
    projectRoot: tmpDir,
    scriptedAnswers: [],
  };
  const suite: Suite = {
    id: 'suite',
    description: '',
    systemPrompt: { text: '' },
    commandParser: parser,
    scenarios: [],
  };
  const recorder = new RunRecorder('read-test', 'prompt');
  const context = createHarnessContext(suite, scenario, recorder);
  const { Read } = createHarnessTools(context);
  const read = Read as unknown as {
    execute: (args: { file_path: string }) => Promise<{ content?: string; error?: string }>;
  };

  return { read, recorder };
}

function readCalls(recorder: RunRecorder) {
  return recorder.build().toolCalls.filter((call) => call.name === 'Read');
}

describe('Read tool records exactly once per call', () => {
  it('records a single Read for a successful read (with byte count)', async () => {
    const { read, recorder } = makeHarness();

    const result = await read.execute({ file_path: 'README.md' });

    expect(result.content).toBe('hello world');

    const calls = readCalls(recorder);
    expect(calls).toHaveLength(1);
    expect(calls[0].result).toMatchObject({ bytes: 'hello world'.length });
  });

  it('records a single Read for a PNG placeholder', async () => {
    const { read, recorder } = makeHarness();

    await read.execute({ file_path: 'qr.png' });

    expect(readCalls(recorder)).toHaveLength(1);
  });

  it('records a single Read for a failed read', async () => {
    const { read, recorder } = makeHarness();

    const result = await read.execute({ file_path: 'does-not-exist.txt' });

    expect(result.error).toBeDefined();
    expect(readCalls(recorder)).toHaveLength(1);
  });
});
