import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildChatSdkInstallCommand,
  resolveChatSdkPackagesToInstall,
} from './package-install';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-chat-sdk-install-'));
  tempDirs.push(dir);

  return dir;
}

describe('resolveChatSdkPackagesToInstall', () => {
  it('installs only the Novu adapter when chat and a state adapter already exist', () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          chat: '4.31.0',
          '@chat-adapter/state-redis': '4.31.0',
        },
      })
    );

    expect(resolveChatSdkPackagesToInstall(dir)).toEqual(['@novu/chat-sdk-adapter']);
    expect(buildChatSdkInstallCommand(dir)).toBe('npm install @novu/chat-sdk-adapter --no-workspaces');
  });

  it('includes state-memory only when no state adapter is present', () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          chat: '4.31.0',
        },
      })
    );

    expect(resolveChatSdkPackagesToInstall(dir)).toEqual([
      '@novu/chat-sdk-adapter',
      '@chat-adapter/state-memory@4.31.0',
    ]);
  });
});
