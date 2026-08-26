import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NOVU_STAGING_API_URL } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { CloudRegionEnum } from '../../../dev/enums';
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
  it('pins @novu/react and @novu/js to next on staging API', () => {
    expect(resolveAgentChatNovuDependencies(NOVU_STAGING_API_URL)).toEqual({
      react: 'next',
      js: 'next',
    });
  });

  it('pins @novu/react and @novu/js to next on local API', () => {
    expect(resolveAgentChatNovuDependencies('http://localhost:3000')).toEqual({
      react: 'next',
      js: 'next',
    });
  });

  it('uses latest from npm when scaffolding against production API', () => {
    expect(resolveAgentChatNovuDependencies('https://api.novu.co')).toEqual({
      react: 'latest',
      js: 'latest',
    });
  });

  it('pins next packages when --staging region is set even with a custom api url', () => {
    expect(resolveAgentChatNovuDependencies('http://localhost:3000', CloudRegionEnum.STAGING)).toEqual({
      react: 'next',
      js: 'next',
    });
  });
});
