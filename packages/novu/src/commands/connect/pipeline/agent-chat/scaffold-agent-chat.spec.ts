import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NOVU_STAGING_API_URL } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  assertSafeScaffoldDirectoryName,
  resolveAgentChatNovuDependencies,
  scaffoldAgentChatProject,
} from './scaffold-agent-chat';

describe('assertSafeScaffoldDirectoryName', () => {
  it('accepts a simple directory name', () => {
    expect(() => assertSafeScaffoldDirectoryName('support-agent-agent-chat')).not.toThrow();
  });

  it('rejects path traversal segments', () => {
    expect(() => assertSafeScaffoldDirectoryName('../../../../tmp/malicious-agent-chat')).toThrow(
      /Invalid scaffold directory name/
    );
  });

  it('rejects absolute paths', () => {
    expect(() => assertSafeScaffoldDirectoryName('/tmp/malicious-agent-chat')).toThrow(
      /Invalid scaffold directory name/
    );
  });
});

describe('scaffoldAgentChatProject', () => {
  it('rejects unsafe agent identifiers before writing outside the parent directory', async () => {
    const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-agent-chat-scaffold-'));

    await expect(
      scaffoldAgentChatProject({
        parentDir,
        agentIdentifier: '../../../../tmp/malicious',
        applicationIdentifier: 'app-id',
        subscriberId: 'subscriber-id',
        apiUrl: 'http://localhost:3000',
      })
    ).rejects.toThrow(/Invalid scaffold directory name/);
  });
});

describe('resolveAgentChatNovuDependencies', () => {
  const localNovuDeps = { reactDir: '/repo/packages/react', jsDir: '/repo/packages/js' };

  it('pins @novu/react and @novu/js to rc on staging, even from a monorepo checkout', () => {
    expect(resolveAgentChatNovuDependencies(NOVU_STAGING_API_URL, localNovuDeps)).toEqual({
      react: 'rc',
      js: 'rc',
      useLocalAliases: false,
    });
  });

  it('uses file: links for a local monorepo checkout against non-staging APIs', () => {
    expect(resolveAgentChatNovuDependencies('https://api.novu.co', localNovuDeps)).toEqual({
      react: 'file:/repo/packages/react',
      js: 'file:/repo/packages/js',
      useLocalAliases: true,
    });
  });

  it('uses latest @novu/react when there is no local checkout', () => {
    expect(resolveAgentChatNovuDependencies('https://api.novu.co', undefined)).toEqual({
      react: 'latest',
      useLocalAliases: false,
    });
  });
});
