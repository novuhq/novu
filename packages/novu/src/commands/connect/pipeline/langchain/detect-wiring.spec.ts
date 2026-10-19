import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectLangChainWiring } from './detect-wiring';

function writeFile(dir: string, rel: string, contents: string) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

describe('detectLangChainWiring', () => {
  it('detects langchain import and novu bridge route', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-langchain-wire-'));
    writeFile(
      dir,
      'app/novu/agents/support-agent.tsx',
      "import { agent } from '@novu/framework/langchain';\nexport const supportAgent = agent('x', {});"
    );
    writeFile(dir, 'app/api/novu/route.ts', "import { serve } from '@novu/framework/next';");
    expect(detectLangChainWiring(dir)).toEqual({
      hasLangChainImport: true,
      hasBridgeRoute: true,
      isWired: true,
    });
  });

  it('is not wired without langchain import', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-langchain-wire-'));
    writeFile(dir, 'app/api/novu/route.ts', "import { serve } from '@novu/framework/next';");
    expect(detectLangChainWiring(dir).isWired).toBe(false);
  });

  it('does not treat an ai-sdk import as langchain wiring', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-langchain-wire-'));
    writeFile(
      dir,
      'app/novu/agents/support-agent.tsx',
      "import { agent } from '@novu/framework/ai-sdk';\nexport const supportAgent = agent('x', {});"
    );
    writeFile(dir, 'app/api/novu/route.ts', "import { serve } from '@novu/framework/next';");
    expect(detectLangChainWiring(dir).hasLangChainImport).toBe(false);
    expect(detectLangChainWiring(dir).isWired).toBe(false);
  });
});
