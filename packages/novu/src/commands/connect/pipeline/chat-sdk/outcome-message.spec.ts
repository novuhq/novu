import { describe, expect, it } from 'vitest';
import { resolveChatSdkOutcomeMessage } from './outcome-message';

describe('resolveChatSdkOutcomeMessage', () => {
  it('returns null for non-chat-sdk connect mode', () => {
    expect(
      resolveChatSdkOutcomeMessage('demo', {
        projectKind: 'existing',
        projectDir: '/tmp',
        scaffolded: false,
        needsAgentFollowUp: true,
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

  it('describes follow-up wiring for existing projects', () => {
    const message = resolveChatSdkOutcomeMessage('chat-sdk', {
      projectKind: 'existing',
      projectDir: '/tmp/app',
      scaffolded: false,
      needsAgentFollowUp: true,
    });

    expect(message).toContain('coding agent');
  });

  it('describes has-adapter reconnects', () => {
    const message = resolveChatSdkOutcomeMessage('chat-sdk', {
      projectKind: 'has-adapter',
      projectDir: '/tmp/app',
      scaffolded: false,
      needsAgentFollowUp: false,
    });

    expect(message).toContain('adapter dependency detected');
  });
});
