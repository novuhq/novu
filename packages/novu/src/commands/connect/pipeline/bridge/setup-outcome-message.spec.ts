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

  it('returns null for scaffolded custom-code projects after next steps are printed', () => {
    const message = resolveBridgeSetupFollowUpMessage('ai-sdk', {
      customCode: {
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
});
