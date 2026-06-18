import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectChatSdkProject } from './detect-project';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-chat-sdk-detect-'));
  tempDirs.push(dir);

  return dir;
}

describe('detectChatSdkProject', () => {
  it('classifies an empty directory as empty', () => {
    const dir = makeTempDir();

    expect(detectChatSdkProject(dir)).toEqual({
      kind: 'empty',
      projectDir: dir,
    });
  });

  it('classifies any package.json project as project', () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@novu/chat-sdk-adapter': 'latest' } })
    );

    expect(detectChatSdkProject(dir).kind).toBe('project');
  });

  it('classifies a Chat SDK project without the Novu adapter as project', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { chat: '4.30.0' } }));

    expect(detectChatSdkProject(dir).kind).toBe('project');
  });

  it('classifies any other package.json project as project', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '16.2.1' } }));

    expect(detectChatSdkProject(dir).kind).toBe('project');
  });

  it('throws when package.json exists but is invalid JSON', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), '{not-json');

    expect(() => detectChatSdkProject(dir)).toThrow(/could not parse it/i);
  });
});
