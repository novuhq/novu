import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONNECT_HELP_TEXT } from '../help-text';
import type { ConnectSuccessResult } from './format-web-chat-success';
import { printConnectSuccess } from './print-connect-success';

const baseResult: ConnectSuccessResult = {
  agent: {
    id: 'agent-id',
    identifier: 'support-agent',
    name: 'Support Agent',
  },
  dashboardUrl: 'https://dashboard.novu.test',
  connectDashboardUrl: 'https://dashboard.novu.test',
  environmentSlug: 'dev',
  connectedChannel: 'web-chat',
  dashboardRedirectChannel: null,
  isKeyless: false,
  claimUrl: null,
  connectMode: 'demo',
  webChatHandoff: {
    dashboardUrl: 'https://dashboard.novu.test/env/dev/agents/support-agent/chat',
  },
};

describe('Web Chat success help contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    {
      successLine: '✓ Web Chat connected',
      result: {
        ...baseResult,
        webChatOutcome: {
          mode: 'embed' as const,
          projectDir: '/tmp/existing-app',
          alreadyWired: false,
        },
      },
    },
    {
      successLine: '✓ Web Chat app ready.',
      result: {
        ...baseResult,
        webChatOutcome: {
          mode: 'scaffold' as const,
          projectDir: '/tmp/web-chat-app',
        },
      },
    },
    {
      successLine: '✓ Agent app ready with Web Chat.',
      result: {
        ...baseResult,
        connectMode: 'ai-sdk' as const,
        aiSdkOutcome: {
          projectKind: 'empty' as const,
          projectDir: '/tmp/bridge-app',
          scaffolded: true,
        },
        webChatOutcome: {
          mode: 'scaffold' as const,
          projectDir: '/tmp/bridge-app',
          scaffolded: true,
          mergedIntoBridge: true,
        },
      },
    },
    {
      successLine: '✓ Web Chat linked — add it to your app.',
      result: {
        ...baseResult,
        webChatOutcome: {
          mode: 'skip' as const,
        },
      },
    },
  ])('documents "$successLine"', ({ successLine, result }) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    printConnectSuccess(result);

    expect(log).toHaveBeenCalledWith(successLine);
    expect(CONNECT_HELP_TEXT).toContain(successLine);
  });
});
