import { describe, expect, it } from 'vitest';
import {
  buildOnboardingAgentPrompt,
  buildWebChatPrompt,
  buildWebChatTuiCommand,
  buildWebChatTuiCommandForDisplay,
} from './web-chat-connect-prompt';
import { NOVU_STAGING_API_URL } from './novu-connect-cli';

describe('web-chat-connect-prompt', () => {
  it('uses latest TUI command on US Cloud', () => {
    expect(buildWebChatTuiCommand('https://api.novu.co')).toBe('npx novu@latest connect --channel web-chat');
  });

  it('uses rc and --region staging on staging', () => {
    expect(buildWebChatTuiCommand(NOVU_STAGING_API_URL)).toBe(
      'npx novu@rc connect --channel web-chat --region staging'
    );
  });

  it('keeps --api-url for EU and local TUI commands', () => {
    expect(buildWebChatTuiCommand('https://eu.api.novu.co')).toBe(
      'npx novu@latest connect --channel web-chat --api-url https://eu.api.novu.co'
    );
    expect(buildWebChatTuiCommand('http://localhost:3000')).toBe(
      'npx novu@rc connect --channel web-chat --api-url http://localhost:3000'
    );
  });

  it('includes agent identifier and local dashboard URLs when provided', () => {
    expect(
      buildWebChatTuiCommand({
        apiUrl: 'http://localhost:3000',
        agentIdentifier: 'support-agent',
        connectDashboardUrl: 'http://localhost:4201',
      })
    ).toBe(
      'npx novu@rc connect --channel web-chat --api-url http://localhost:3000 --connect-dashboard-url http://localhost:4201 --dashboard-url http://localhost:4201 --agent-identifier support-agent'
    );
  });

  it('formats the TUI command for terminal display with line continuations', () => {
    expect(
      buildWebChatTuiCommandForDisplay({
        apiUrl: 'http://localhost:3000',
        agentIdentifier: 'support-agent',
        connectDashboardUrl: 'http://localhost:4201',
      })
    ).toBe(
      'npx novu@rc connect --channel web-chat \\\n  --api-url http://localhost:3000 \\\n  --connect-dashboard-url http://localhost:4201 \\\n  --dashboard-url http://localhost:4201 \\\n  --agent-identifier support-agent'
    );
  });

  it('adds a staging hint to the copy prompt', () => {
    const prompt = buildWebChatPrompt('Fred', 'fred', NOVU_STAGING_API_URL);

    expect(prompt).toContain('Novu staging dashboard');
    expect(prompt).toContain('npx novu@rc');
    expect(prompt).toContain('--region staging');
  });

  it('pins runtime and agent on the TUI command for a dashboard-created bridge agent', () => {
    expect(
      buildWebChatTuiCommand({
        apiUrl: NOVU_STAGING_API_URL,
        agentIdentifier: 'staging-investigator',
        runtime: 'ai-sdk',
      })
    ).toBe(
      'npx novu@rc connect --runtime ai-sdk --channel web-chat --region staging --agent-identifier staging-investigator'
    );
  });

  it('tells the coding agent not to re-pick runtime or channel when runtime is known', () => {
    const prompt = buildWebChatPrompt('Fred', 'fred', NOVU_STAGING_API_URL, { runtime: 'ai-sdk' });

    expect(prompt).toContain('--runtime ai-sdk');
    expect(prompt).toContain('--channel web-chat');
    expect(prompt).toContain('--agent-identifier fred');
    expect(prompt).toContain('Do not ask me to pick runtime, channel, or agent');
    expect(prompt).not.toContain('Connect a Novu agent to Web Chat for this project');
  });

  it('keeps the production copy prompt on US Cloud', () => {
    const prompt = buildOnboardingAgentPrompt('https://api.novu.co');

    expect(prompt).not.toContain('novu@rc');
    expect(prompt).toContain('Connect a Novu agent to Web Chat for this project');
    expect(prompt).not.toContain('to my app');
    expect(prompt).toContain('https://novu.co/agents.md');
  });
});
