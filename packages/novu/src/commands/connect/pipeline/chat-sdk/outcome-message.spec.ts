import { describe, expect, it } from 'vitest';
import { resolveChatSdkOutcomeMessage } from './outcome-message';

describe('resolveChatSdkOutcomeMessage', () => {
  it('returns null for non-chat-sdk connect mode', () => {
    expect(
      resolveChatSdkOutcomeMessage('demo', {
        projectKind: 'project',
        projectDir: '/tmp',
        scaffolded: false,
        coreReady: false,
      })
    ).toBeNull();
  });

  it('describes scaffolded projects that need install', () => {
    const message = resolveChatSdkOutcomeMessage('chat-sdk', {
      projectKind: 'empty',
      projectDir: '/tmp/app',
      scaffolded: true,
      skippedInstall: true,
    });

    expect(message).toContain('npm install');
  });

  it('describes remaining setup when core is not ready', () => {
    const message = resolveChatSdkOutcomeMessage('chat-sdk', {
      projectKind: 'project',
      projectDir: '/tmp/app',
      scaffolded: false,
      coreReady: false,
      requirements: [{ id: 'package', status: 'manual', detail: 'Run npm install' }],
    });

    expect(message).toContain('Finish setup');
  });

  it('describes ready projects without tunnel', () => {
    const message = resolveChatSdkOutcomeMessage('chat-sdk', {
      projectKind: 'project',
      projectDir: '/tmp/app',
      scaffolded: false,
      coreReady: true,
      tunnelAccepted: false,
    });

    expect(message).toContain('npm run dev:novu');
  });
});
