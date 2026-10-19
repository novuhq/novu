import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectAiSdkWiring } from './detect-wiring';

function writeFile(dir: string, rel: string, contents: string) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

describe('detectAiSdkWiring', () => {
  it('detects ai-sdk import and novu bridge route', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-wire-'));
    writeFile(
      dir,
      'app/novu/agents/support-agent.tsx',
      "import { agent } from '@novu/framework/ai-sdk';\nexport const supportAgent = agent('x', {});"
    );
    writeFile(dir, 'app/api/novu/route.ts', "import { serve } from '@novu/framework/next';");
    expect(detectAiSdkWiring(dir)).toEqual({
      hasAiSdkImport: true,
      hasBridgeRoute: true,
      isWired: true,
    });
  });

  it('is not wired without ai-sdk import', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-wire-'));
    writeFile(dir, 'app/api/novu/route.ts', "import { serve } from '@novu/framework/next';");
    expect(detectAiSdkWiring(dir).isWired).toBe(false);
  });
});
