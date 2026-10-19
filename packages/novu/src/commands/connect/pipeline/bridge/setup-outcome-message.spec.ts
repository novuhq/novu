import { describe, expect, it } from 'vitest';

import type { AgentConnectMode } from '../../types';
import { resolveBridgeSetupFollowUpMessage } from './setup-outcome-message';

describe('resolveBridgeSetupFollowUpMessage', () => {
  it('returns null for unrelated connect modes', () => {
    const message = resolveBridgeSetupFollowUpMessage('demo', {});

    expect(message).toBeNull();
  });

  it('returns null for scaffolded chat-sdk projects after next steps are printed', () => {
    const message = resolveBridgeSetupFollowUpMessage('chat-sdk', {
      chatSdk: {
        projectKind: 'empty',
        projectDir: '/tmp/chat-sdk',
        scaffolded: true,
        skippedInstall: true,
      },
    });

    expect(message).toBeNull();
  });

  it('returns null for scaffolded ai-sdk projects after next steps are printed', () => {
    const message = resolveBridgeSetupFollowUpMessage('ai-sdk', {
      aiSdk: {
        projectKind: 'empty',
        projectDir: '/tmp/agent-app',
        scaffolded: true,
      },
    });

    expect(message).toBeNull();
  });

  it('guides existing custom-code projects without scaffolding', () => {
    const message = resolveBridgeSetupFollowUpMessage('custom-code', {
      customCode: {
        projectDir: '/tmp/existing-app',
        scaffolded: false,
      },
    });

    expect(message).toContain('Wire your agent code');
  });

  it('describes ready chat-sdk projects without tunnel', () => {
    const message = resolveBridgeSetupFollowUpMessage('chat-sdk' satisfies AgentConnectMode, {
      chatSdk: {
        projectKind: 'project',
        projectDir: '/tmp/chat-sdk',
        scaffolded: false,
        coreReady: true,
      },
    });

    expect(message).toContain('npm run dev:novu');
  });

  it('prioritizes manual code wiring over coreReady for ai-sdk projects', () => {
    const message = resolveBridgeSetupFollowUpMessage('ai-sdk', {
      aiSdk: {
        projectKind: 'project',
        projectDir: '/tmp/agent-app',
        scaffolded: false,
        coreReady: true,
        requirements: [
          { id: 'package', status: 'ok', detail: '@novu/framework and ai installed' },
          { id: 'env', status: 'ok', detail: 'Novu credentials configured' },
          { id: 'dev-script', status: 'ok', detail: 'dev:novu script present' },
          {
            id: 'code-wiring',
            status: 'manual',
            detail: '@novu/framework/ai-sdk import not found; bridge route app/api/novu/route.ts not found',
          },
        ],
      },
    });

    expect(message).toContain('Finish setup:');
    expect(message).toContain('@novu/framework/ai-sdk import not found');
    expect(message).not.toContain('npm run dev:novu');
  });

  it('prioritizes manual code wiring over coreReady for chat-sdk projects', () => {
    const message = resolveBridgeSetupFollowUpMessage('chat-sdk', {
      chatSdk: {
        projectKind: 'project',
        projectDir: '/tmp/chat-sdk',
        scaffolded: false,
        coreReady: true,
        requirements: [
          { id: 'package', status: 'ok', detail: '@novu/framework installed' },
          { id: 'env', status: 'ok', detail: 'Novu credentials configured' },
          { id: 'dev-script', status: 'ok', detail: 'dev:novu script present' },
          {
            id: 'code-wiring',
            status: 'manual',
            detail: 'bridge route app/api/novu/route.ts not found',
          },
        ],
      },
    });

    expect(message).toContain('Finish setup:');
    expect(message).toContain('bridge route app/api/novu/route.ts not found');
    expect(message).not.toContain('npm run dev:novu');
  });
});
