import { describe, expect, it } from 'vitest';
import { detectHost, HOST_MARKER_VARIABLES, isHostId } from './host';

describe('detectHost', () => {
  it('knows each host by what it sets for the commands its agent runs', () => {
    expect(detectHost({ AI_AGENT: 'claude-code_2-1-309_agent', CLAUDECODE: '1', CLAUDE_CODE_CHILD_SESSION: '1' })).toBe(
      'claude-code'
    );
    expect(detectHost({ CLAUDECODE: '1', CLAUDE_CODE_CHILD_SESSION: '1' })).toBe('claude-code');
    expect(detectHost({ CODEX_THREAD_ID: '019a5c1e-7b1d-7f40-a0b4-2c1f5e0b9a11' })).toBe('codex');
    expect(detectHost({ CODEX_CI: '1' })).toBe('codex');
    expect(detectHost({ CODEX_SANDBOX: 'seatbelt' })).toBe('codex');
    expect(detectHost({ OPENCODE: '1', AGENT: '1', OPENCODE_PID: '4242' })).toBe('opencode');
    expect(detectHost({ OPENCODE_SESSION_ID: 'ses_1', AI_AGENT: 'opencode' })).toBe('opencode');
    expect(detectHost({ CURSOR_AGENT: '1' })).toBe('cursor');
    expect(detectHost({ CURSOR_EXTENSION_HOST_ROLE: 'agent-exec' })).toBe('cursor');
    expect(detectHost({ CURSOR_SANDBOX: 'seatbelt' })).toBe('cursor');
    expect(detectHost({ AI_AGENT: 'hermes-agent', HERMES_AGENT: 'true', HERMES_SESSION_ID: 'h1' })).toBe('hermes');
    expect(detectHost({ HERMES_SESSION_ID: 'h1' })).toBe('hermes');
    expect(detectHost({ OPENCLAW_SHELL: 'exec', OPENCLAW_CLI: '1' })).toBe('openclaw');
  });

  it('counts no one for a person typing in an app’s terminal, or what an app sets for everything in it', () => {
    expect(detectHost({})).toBe(null);
    // Claude Code's IDE extensions set this in every terminal of the editor.
    expect(detectHost({ CLAUDECODE: '1', CLAUDE_CODE_SSE_PORT: '56823', TERM_PROGRAM: 'vscode' })).toBe(null);
    // Claude Code's hooks and MCP servers, not its agent.
    expect(detectHost({ AI_AGENT: 'claude-code_2-1-309_harness', CLAUDE_CODE_ENTRYPOINT: 'cli' })).toBe(null);
    expect(detectHost({ CURSOR_TRACE_ID: 'abc', CURSOR_EXTENSION_HOST_ROLE: 'user' })).toBe(null);
    expect(detectHost({ OPENCLAW_SHELL: 'tui-local', OPENCLAW_CLI: '1' })).toBe(null);
    expect(detectHost({ OPENCODE_TERMINAL: '1', OPENCODE_CLIENT: 'desktop', AGENT: '1' })).toBe(null);
    expect(detectHost({ CODEX_MANAGED_BY_NPM: '1' })).toBe(null);
    expect(detectHost({ CODEX_THREAD_ID: '  ', CURSOR_AGENT: '' })).toBe(null);
  });

  it('takes Claude Code’s agent over the Cursor terminal it runs in, and Codex over the Claude Code that started it', () => {
    expect(detectHost({ AI_AGENT: 'claude-code_2-1-309_agent', TERM_PROGRAM: 'vscode', CURSOR_TRACE_ID: 'abc' })).toBe(
      'claude-code'
    );
    expect(detectHost({ AI_AGENT: 'claude-code_2-1-309_agent', CURSOR_AGENT: '1' })).toBe('claude-code');
    expect(
      detectHost({ AI_AGENT: 'claude-code_2-1-309_agent', CLAUDECODE: '1', CODEX_THREAD_ID: 't1', CODEX_CI: '1' })
    ).toBe('codex');
    // Claude Code started by Hermes keeps Hermes's variables, and its own come first.
    expect(detectHost({ AI_AGENT: 'claude-code_2-1-309_agent', HERMES_AGENT: 'true' })).toBe('claude-code');
  });

  it('reads the environment of this process by default', () => {
    expect(HOST_MARKER_VARIABLES).toContain('AI_AGENT');
    expect(HOST_MARKER_VARIABLES).toContain('OPENCLAW_SHELL');
    expect(typeof detectHost()).not.toBe('undefined');
  });
});

describe('isHostId', () => {
  it('knows the hosts the API tells apart', () => {
    expect(isHostId('claude-code')).toBe(true);
    expect(isHostId('grok')).toBe(true);
    expect(isHostId('windsurf')).toBe(false);
    expect(isHostId(undefined)).toBe(false);
  });
});
