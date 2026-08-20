import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONNECT_HELP_TEXT } from '../help-text';
import type { ConnectSuccessResult } from './format-agent-chat-success';
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
  connectedChannel: 'agent-chat',
  dashboardRedirectChannel: null,
  isKeyless: false,
  claimUrl: null,
  connectMode: 'demo',
  agentChatHandoff: {
    dashboardUrl: 'https://dashboard.novu.test/env/dev/agents/support-agent/chat',
  },
};

describe('Agent Chat success help contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    {
      successLine: '✓ Agent Chat connected',
      result: {
        ...baseResult,
        agentChatOutcome: {
          mode: 'embed' as const,
          projectDir: '/tmp/existing-app',
          alreadyWired: false,
        },
      },
    },
    {
      successLine: '✓ Agent Chat app ready.',
      result: {
        ...baseResult,
        agentChatOutcome: {
          mode: 'scaffold' as const,
          projectDir: '/tmp/agent-chat-app',
        },
      },
    },
    {
      successLine: '✓ Agent app ready with Agent Chat.',
      result: {
        ...baseResult,
        connectMode: 'ai-sdk' as const,
        aiSdkOutcome: {
          projectKind: 'empty' as const,
          projectDir: '/tmp/bridge-app',
          scaffolded: true,
        },
        agentChatOutcome: {
          mode: 'scaffold' as const,
          projectDir: '/tmp/bridge-app',
          scaffolded: true,
          mergedIntoBridge: true,
        },
      },
    },
    {
      successLine: '✓ Agent Chat linked — add it to your app.',
      result: {
        ...baseResult,
        agentChatOutcome: {
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
