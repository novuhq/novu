import { describe, expect, it } from 'vitest';

import { buildClaudePlatformAgentConsoleUrl, DEFAULT_CLAUDE_WORKSPACE_ID } from './anthropic-aws';

describe('buildClaudePlatformAgentConsoleUrl', () => {
  it('builds a workspace-scoped agent deep link', () => {
    expect(buildClaudePlatformAgentConsoleUrl('agent_123', 'wrkspc_test')).toBe(
      'https://platform.claude.com/workspaces/wrkspc_test/agents/agent_123'
    );
  });

  it('falls back to the default workspace when none is provided', () => {
    expect(buildClaudePlatformAgentConsoleUrl('agent_123')).toBe(
      `https://platform.claude.com/workspaces/${DEFAULT_CLAUDE_WORKSPACE_ID}/agents/agent_123`
    );
  });
});
