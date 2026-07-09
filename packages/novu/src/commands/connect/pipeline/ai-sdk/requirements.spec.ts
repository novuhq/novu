import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { computeAiSdkRequirements } from './requirements';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-req-'));
  tempDirs.push(dir);

  return dir;
}

describe('computeAiSdkRequirements', () => {
  it('marks a fully wired project as coreReady', () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@novu/framework': 'latest',
          ai: '^7.0.0',
        },
        scripts: {
          'dev:novu': 'next dev --port=4005',
        },
      })
    );
    fs.writeFileSync(path.join(dir, '.env.local'), 'NOVU_SECRET_KEY=sk_test_key\n');
    fs.mkdirSync(path.join(dir, 'app/novu/agents'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'app/novu/agents/support-agent.tsx'),
      "import { agent } from '@novu/framework/ai-sdk';\nexport const supportAgent = agent('x', {});"
    );
    fs.mkdirSync(path.join(dir, 'app/api/novu'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app/api/novu/route.ts'), "import { serve } from '@novu/framework/next';");

    const snapshot = computeAiSdkRequirements({
      projectDir: dir,
      secretKey: 'sk_test_key',
      agentIdentifier: 'support-agent',
    });

    expect(snapshot.coreReady).toBe(true);
    expect(snapshot.requirements.filter((req) => req.id !== 'provider-env').every((req) => req.status === 'ok')).toBe(
      true
    );
  });

  it('flags missing framework as autofixable and missing route as manual', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '16.2.1' } }));

    const snapshot = computeAiSdkRequirements({
      projectDir: dir,
      secretKey: 'sk_test_key',
      agentIdentifier: 'support-agent',
    });

    expect(snapshot.coreReady).toBe(false);
    expect(snapshot.requirements.find((req) => req.id === 'package')?.status).toBe('autofixable');
    expect(snapshot.requirements.find((req) => req.id === 'env')?.status).toBe('autofixable');
    expect(snapshot.requirements.find((req) => req.id === 'code-wiring')?.status).toBe('manual');
  });

  it('flags incompatible ai v6 as manual with upgrade instructions', () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@novu/framework': 'latest',
          ai: '^6.0.0',
        },
      })
    );

    const snapshot = computeAiSdkRequirements({
      projectDir: dir,
      secretKey: 'sk_test_key',
      agentIdentifier: 'support-agent',
    });

    const packageReq = snapshot.requirements.find((req) => req.id === 'package');

    expect(snapshot.coreReady).toBe(false);
    expect(packageReq?.status).toBe('manual');
    expect(packageReq?.detail).toContain('Incompatible ai version (^6.0.0)');
    expect(packageReq?.detail).toContain('ai@^7.0.0');
  });

  it('adds provider env hints without blocking coreReady', () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@novu/framework': 'latest',
          ai: '^7.0.0',
          '@ai-sdk/openai': '1.0.0',
        },
        scripts: {
          'dev:novu': 'next dev --port=4005',
        },
      })
    );
    fs.writeFileSync(path.join(dir, '.env.local'), 'NOVU_SECRET_KEY=sk_test_key\n');
    fs.mkdirSync(path.join(dir, 'app/novu/agents'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'app/novu/agents/support-agent.tsx'),
      "import { agent } from '@novu/framework/ai-sdk';\nexport const supportAgent = agent('x', {});"
    );
    fs.mkdirSync(path.join(dir, 'app/api/novu'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app/api/novu/route.ts'), "import { serve } from '@novu/framework/next';");

    const snapshot = computeAiSdkRequirements({
      projectDir: dir,
      secretKey: 'sk_test_key',
      agentIdentifier: 'support-agent',
    });

    expect(snapshot.coreReady).toBe(true);
    expect(snapshot.requirements.some((req) => req.detail === 'Set OPENAI_API_KEY for your LLM')).toBe(true);
  });
});
