import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertSafeScaffoldDirectoryName, scaffoldAgentChatProject } from './scaffold-agent-chat';

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
