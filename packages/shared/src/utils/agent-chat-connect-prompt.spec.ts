import { describe, expect, it } from 'vitest';
import {
  buildAgentChatPrompt,
  buildAgentChatTuiCommand,
  buildAgentChatTuiCommandForDisplay,
  buildOnboardingAgentPrompt,
} from './agent-chat-connect-prompt';
import { NOVU_STAGING_API_URL } from './novu-connect-cli';

describe('agent-chat-connect-prompt', () => {
  it('uses latest TUI command on US Cloud', () => {
    expect(buildAgentChatTuiCommand('https://api.novu.co')).toBe('npx novu@latest connect --channel agent-chat');
  });

  it('uses rc and --region staging on staging', () => {
    expect(buildAgentChatTuiCommand(NOVU_STAGING_API_URL)).toBe(
      'npx novu@rc connect --channel agent-chat --region staging'
    );
  });

  it('keeps --api-url for EU and local TUI commands', () => {
    expect(buildAgentChatTuiCommand('https://eu.api.novu.co')).toBe(
      'npx novu@latest connect --channel agent-chat --api-url https://eu.api.novu.co'
    );
    expect(buildAgentChatTuiCommand('http://localhost:3000')).toBe(
      'npx novu@rc connect --channel agent-chat --api-url http://localhost:3000'
    );
  });

  it('includes agent identifier and local dashboard URLs when provided', () => {
    expect(
      buildAgentChatTuiCommand({
        apiUrl: 'http://localhost:3000',
        agentIdentifier: 'support-agent',
        connectDashboardUrl: 'http://localhost:4201',
      })
    ).toBe(
      'npx novu@rc connect --channel agent-chat --api-url http://localhost:3000 --connect-dashboard-url http://localhost:4201 --dashboard-url http://localhost:4201 --agent-identifier support-agent'
    );
  });

  it('formats the TUI command for terminal display with line continuations', () => {
    expect(
      buildAgentChatTuiCommandForDisplay({
        apiUrl: 'http://localhost:3000',
        agentIdentifier: 'support-agent',
        connectDashboardUrl: 'http://localhost:4201',
      })
    ).toBe(
      'npx novu@rc connect --channel agent-chat \\\n  --api-url http://localhost:3000 \\\n  --connect-dashboard-url http://localhost:4201 \\\n  --dashboard-url http://localhost:4201 \\\n  --agent-identifier support-agent'
    );
  });

  it('adds a staging hint to the copy prompt', () => {
    const prompt = buildAgentChatPrompt('Fred', 'fred', NOVU_STAGING_API_URL);

    expect(prompt).toContain('Novu staging dashboard');
    expect(prompt).toContain('npx novu@rc');
    expect(prompt).toContain('--region staging');
  });

  it('pins runtime and agent on the TUI command for a dashboard-created bridge agent', () => {
    expect(
      buildAgentChatTuiCommand({
        apiUrl: NOVU_STAGING_API_URL,
        agentIdentifier: 'staging-investigator',
        runtime: 'ai-sdk',
      })
    ).toBe(
      'npx novu@rc connect --runtime ai-sdk --channel agent-chat --region staging --agent-identifier staging-investigator'
    );
  });

  it('tells the coding agent not to re-pick runtime or channel when runtime is known', () => {
    const prompt = buildAgentChatPrompt('Fred', 'fred', NOVU_STAGING_API_URL, { runtime: 'ai-sdk' });

    expect(prompt).toContain('--runtime ai-sdk');
    expect(prompt).toContain('--channel agent-chat');
    expect(prompt).toContain('--agent-identifier fred');
    expect(prompt).toContain('Do not ask me to pick runtime, channel, or agent');
    expect(prompt).not.toContain('Connect a Novu agent to Agent Chat for this project');
  });

  it('keeps the production copy prompt on US Cloud', () => {
    const prompt = buildOnboardingAgentPrompt('https://api.novu.co');

    expect(prompt).not.toContain('novu@rc');
    expect(prompt).toContain('Connect a Novu agent to Agent Chat for this project');
    expect(prompt).not.toContain('to my app');
    expect(prompt).toContain('https://novu.co/agents.md');
  });
});
