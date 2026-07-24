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
  const recorder = new RunRecorder('read-test', 'prompt', tmpDir);
  const context = createHarnessContext(suite, scenario, recorder);
  const tools = createHarnessTools(context);

  return { tools, recorder, scenario, suite };
}

function readCalls(recorder: RunRecorder) {
  return recorder.build().toolCalls.filter((call) => call.name === 'Read');
}

describe('Read tool records exactly once per call', () => {
  it('records a single Read for a successful read (with byte count)', async () => {
    const { tools, recorder } = makeHarness();
    const read = tools.Read as unknown as {
      execute: (args: { file_path: string }) => Promise<{ content?: string; error?: string }>;
    };

    const result = await read.execute({ file_path: 'README.md' });

    expect(result.content).toBe('hello world');

    const calls = readCalls(recorder);
    expect(calls).toHaveLength(1);
    expect(calls[0].result).toMatchObject({ bytes: 'hello world'.length });
  });

  it('records a single Read for a PNG placeholder', async () => {
    const { tools, recorder } = makeHarness();
    const read = tools.Read as unknown as {
      execute: (args: { file_path: string }) => Promise<{ content?: string; error?: string }>;
    };

    await read.execute({ file_path: 'qr.png' });

    expect(readCalls(recorder)).toHaveLength(1);
  });

  it('records a single Read for a failed read', async () => {
    const { tools, recorder } = makeHarness();
    const read = tools.Read as unknown as {
      execute: (args: { file_path: string }) => Promise<{ content?: string; error?: string }>;
    };

    const result = await read.execute({ file_path: 'does-not-exist.txt' });

    expect(result.error).toBeDefined();
    expect(readCalls(recorder)).toHaveLength(1);
  });
});

describe('Write tool', () => {
  it('writes under the fixture root and records writtenFiles without logging content', async () => {
    const { tools, recorder } = makeHarness();
    const write = tools.Write as unknown as {
      execute: (args: { file_path: string; content: string }) => Promise<{ ok?: boolean; error?: string }>;
    };

    const result = await write.execute({
      file_path: 'app/api/novu/route.ts',
      content: 'export const SECRET=sk-live',
    });

    expect(result.ok).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, 'app/api/novu/route.ts'), 'utf8')).toBe('export const SECRET=sk-live');
    expect(recorder.build().writtenFiles).toEqual(['app/api/novu/route.ts']);

    const writeCall = recorder.build().toolCalls.find((call) => call.name === 'Write');
    expect(writeCall?.args).toEqual({ file_path: 'app/api/novu/route.ts' });
    expect(writeCall?.args).not.toHaveProperty('content');
  });

  it('refuses paths outside the fixture root', async () => {
    const { tools } = makeHarness();
    const write = tools.Write as unknown as {
      execute: (args: { file_path: string; content: string }) => Promise<{ ok?: boolean; error?: string }>;
    };

    const result = await write.execute({ file_path: '../escape.ts', content: 'nope' });

    expect(result.error).toMatch(/outside fixture/);
  });

  it('refuses writing through a symlink that escapes the fixture root', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-evals-outside-'));
    const linkPath = path.join(tmpDir, 'escape-link');
    fs.symlinkSync(outside, linkPath);

    const { tools } = makeHarness();
    const write = tools.Write as unknown as {
      execute: (args: { file_path: string; content: string }) => Promise<{ ok?: boolean; error?: string }>;
    };

    const result = await write.execute({ file_path: 'escape-link/pwned.txt', content: 'nope' });

    expect(result.error).toMatch(/symlink/i);
    expect(fs.existsSync(path.join(outside, 'pwned.txt'))).toBe(false);

    fs.rmSync(outside, { recursive: true, force: true });
  });
});
