import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { computeChatSdkRequirements } from './requirements';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-chat-sdk-req-'));
  tempDirs.push(dir);

  return dir;
}

describe('computeChatSdkRequirements', () => {
  it('marks a fully wired project as coreReady', () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@novu/chat-sdk-adapter': 'latest',
          chat: '4.30.0',
          '@chat-adapter/state-memory': '4.30.0',
        },
        scripts: {
          'dev:novu': 'npx novu dev -p 4005 --no-studio --route /api/webhooks/novu --run "next dev --port=4005"',
        },
      })
    );
    fs.writeFileSync(path.join(dir, '.env.local'), 'NOVU_SECRET_KEY=sk_test_key\nNOVU_AGENT_IDENTIFIER=my-agent\n');
    fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'lib/bot.ts'),
      "import { createNovuAdapter } from '@novu/chat-sdk-adapter';\nexport const novu = createNovuAdapter();"
    );
    fs.mkdirSync(path.join(dir, 'app/api/webhooks/novu'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app/api/webhooks/novu/route.ts'), 'export async function POST() {}');

    const snapshot = computeChatSdkRequirements({
      projectDir: dir,
      secretKey: 'sk_test_key',
      agentIdentifier: 'my-agent',
    });

    expect(snapshot.coreReady).toBe(true);
    expect(snapshot.requirements.every((req) => req.status === 'ok')).toBe(true);
  });

  it('flags missing packages and env as autofixable', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '16.2.1' } }));

    const snapshot = computeChatSdkRequirements({
      projectDir: dir,
      secretKey: 'sk_test_key',
      agentIdentifier: 'my-agent',
    });

    expect(snapshot.coreReady).toBe(false);
    expect(snapshot.requirements.find((req) => req.id === 'package')?.status).toBe('autofixable');
    expect(snapshot.requirements.find((req) => req.id === 'env')?.status).toBe('autofixable');
    expect(snapshot.requirements.find((req) => req.id === 'code-wiring')?.status).toBe('manual');
  });
});
