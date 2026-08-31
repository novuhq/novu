import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NOVU_STAGING_API_URL } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { CloudRegionEnum } from '../../../dev/enums';
import {
  assertSafeScaffoldDirectoryName,
  resolveWebChatNovuDependencies,
  scaffoldWebChatProject,
} from './scaffold-web-chat';

describe('assertSafeScaffoldDirectoryName', () => {
  it('accepts a simple directory name', () => {
    expect(() => assertSafeScaffoldDirectoryName('support-agent-web-chat')).not.toThrow();
  });

  it('rejects path traversal segments', () => {
    expect(() => assertSafeScaffoldDirectoryName('../../../../tmp/malicious-web-chat')).toThrow(
      /Invalid scaffold directory name/
    );
  });

  it('rejects absolute paths', () => {
    expect(() => assertSafeScaffoldDirectoryName('/tmp/malicious-web-chat')).toThrow(
      /Invalid scaffold directory name/
    );
  });
});

describe('scaffoldWebChatProject', () => {
  it('rejects unsafe agent identifiers before writing outside the parent directory', async () => {
    const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-scaffold-'));

    await expect(
      scaffoldWebChatProject({
        parentDir,
        agentIdentifier: '../../../../tmp/malicious',
        applicationIdentifier: 'app-id',
        subscriberId: 'subscriber-id',
        apiUrl: 'http://localhost:3000',
      })
    ).rejects.toThrow(/Invalid scaffold directory name/);
  });

  it('does not hardcode localhost when merging Web Chat into an existing project', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-merge-'));
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: 'agent-app',
          dependencies: {
            '@novu/react': 'latest',
            '@novu/js': 'latest',
            'react-markdown': '^10.1.0',
            'remark-gfm': '^4.0.1',
          },
        },
        null,
        2
      )
    );

    await scaffoldWebChatProject({
      parentDir: projectDir,
      agentIdentifier: 'support-agent',
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
      apiUrl: 'https://api.novu.co',
      mergeIntoProjectDir: projectDir,
      mergeAtRoot: true,
    });

    const page = fs.readFileSync(path.join(projectDir, 'app', 'page.tsx'), 'utf8');
    expect(page).not.toContain('localhost:3000');
    expect(page).toContain('...(apiUrl ? { apiUrl } : {})');
    expect(page).toContain('...(socketUrl ? { socketUrl } : {})');
  });
});

describe('resolveWebChatNovuDependencies', () => {
  it('pins @novu/react and @novu/js to next on staging API', () => {
    expect(resolveWebChatNovuDependencies(NOVU_STAGING_API_URL)).toEqual({
      react: 'next',
      js: 'next',
    });
  });

  it('pins @novu/react and @novu/js to next on local API', () => {
    expect(resolveWebChatNovuDependencies('http://localhost:3000')).toEqual({
      react: 'next',
      js: 'next',
    });
  });

  it('uses latest from npm when scaffolding against production API', () => {
    expect(resolveWebChatNovuDependencies('https://api.novu.co')).toEqual({
      react: 'latest',
      js: 'latest',
    });
  });

  it('pins next packages when --staging region is set even with a custom api url', () => {
    expect(resolveWebChatNovuDependencies('http://localhost:3000', CloudRegionEnum.STAGING)).toEqual({
      react: 'next',
      js: 'next',
    });
  });
});
