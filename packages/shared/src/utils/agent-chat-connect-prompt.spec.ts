import { describe, expect, it } from 'vitest';
import {
  buildAgentChatPrompt,
  buildAgentChatTuiCommand,
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
      'npx novu@latest connect --channel agent-chat --api-url http://localhost:3000'
    );
  });

  it('adds a staging hint to the copy prompt', () => {
    const prompt = buildAgentChatPrompt('Fred', 'fred', NOVU_STAGING_API_URL);

    expect(prompt).toContain('Novu staging dashboard');
    expect(prompt).toContain('npx novu@rc');
    expect(prompt).toContain('--region staging');
  });

  it('keeps the production copy prompt on US Cloud', () => {
    const prompt = buildOnboardingAgentPrompt('https://api.novu.co');

    expect(prompt).not.toContain('novu@rc');
    expect(prompt).toContain('https://novu.co/agents.md');
  });
});
