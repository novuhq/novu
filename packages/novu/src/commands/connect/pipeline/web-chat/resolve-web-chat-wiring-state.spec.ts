import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveWebChatProjectWiringState } from './resolve-web-chat-wiring-state';

function writeFile(dir: string, rel: string, contents: string) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

describe('resolveWebChatProjectWiringState', () => {
  it('returns wired when handler, UI, and env are ready for bridge runtimes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-wire-'));
    writeFile(
      dir,
      'app/page.tsx',
      "import { NovuProvider, useWebChat } from '@novu/react';\nexport default function Page() { useWebChat({ agentId: 'a' }); }"
    );
    writeFile(dir, '.env.local', 'NEXT_PUBLIC_NOVU_APP_ID=app\nNEXT_PUBLIC_NOVU_AGENT_ID=agent\n');

    expect(
      resolveWebChatProjectWiringState(dir, 'ai-sdk', {
        projectDir: dir,
        scaffolded: false,
        requirements: [{ id: 'code-wiring', status: 'ok', detail: 'Wired' }],
      })
    ).toBe('wired');
  });

  it('returns partial when only env vars exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-wire-'));
    writeFile(dir, '.env.local', 'NEXT_PUBLIC_NOVU_APP_ID=app\nNEXT_PUBLIC_NOVU_AGENT_ID=agent\n');

    expect(resolveWebChatProjectWiringState(dir, 'ai-sdk')).toBe('partial');
  });

  it('returns unwired for managed demo runtime without UI or env', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-wire-'));

    expect(resolveWebChatProjectWiringState(dir, 'demo')).toBe('unwired');
  });

  it('returns wired for managed runtime when UI and env are both present', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-wire-'));
    writeFile(
      dir,
      'app/page.tsx',
      "import { useWebChat } from '@novu/react';\nexport default function Page() { useWebChat({ agentId: 'a' }); }"
    );
    writeFile(dir, '.env.local', 'NEXT_PUBLIC_NOVU_APP_ID=app\nNEXT_PUBLIC_NOVU_AGENT_ID=agent\n');

    expect(resolveWebChatProjectWiringState(dir, 'demo')).toBe('wired');
  });
});
