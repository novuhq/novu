import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectChatSdkWiring } from './detect-wiring';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-chat-sdk-wiring-'));
  tempDirs.push(dir);

  return dir;
}

describe('detectChatSdkWiring', () => {
  it('detects adapter call and bridge route', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'lib/bot.ts'),
      "import { createNovuAdapter } from '@novu/chat-sdk-adapter';\nexport const novu = createNovuAdapter();"
    );
    fs.mkdirSync(path.join(dir, 'app/api/webhooks/novu'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app/api/webhooks/novu/route.ts'), 'export async function POST() {}');

    expect(detectChatSdkWiring(dir)).toEqual({
      hasAdapterCall: true,
      hasBridgeRoute: true,
      isWired: true,
    });
  });

  it('reports missing wiring when adapter is absent', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src/index.ts'), 'export const bot = {};');

    expect(detectChatSdkWiring(dir)).toEqual({
      hasAdapterCall: false,
      hasBridgeRoute: false,
      isWired: false,
    });
  });

  it('does not treat a bare handleWebhook reference as a bridge route', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'lib/bot.ts'),
      "import { createNovuAdapter } from '@novu/chat-sdk-adapter';\nexport const novu = createNovuAdapter();\n// handleWebhook(request)"
    );

    expect(detectChatSdkWiring(dir)).toEqual({
      hasAdapterCall: true,
      hasBridgeRoute: false,
      isWired: false,
    });
  });
});
