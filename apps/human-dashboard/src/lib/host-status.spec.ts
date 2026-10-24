import { describe, expect, it } from 'vitest';
import { type AgentHost, connectedHostIds, findNewHost, type HostStatus, hostName } from './host-status';
import { isHostId } from './hosts';

const NOW = Date.parse('2026-10-23T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

function statusWith(hosts: AgentHost[]): HostStatus {
  return {
    connected: hosts.length > 0,
    lastCheckedAt: null,
    lastCheckedVia: null,
    hosts,
    firstCheckedAt: null,
    waitingMessage: null,
  };
}

describe('hostName', () => {
  it('names each host the way the dashboard writes it', () => {
    expect(hostName({ id: 'claude-code', via: 'cli' })).toBe('Claude Code');
    expect(hostName({ id: 'grok', via: 'mcp' })).toBe('Grok Bot');
    expect(hostName({ id: 'general', via: 'cli' })).toBe('General');
  });

  it('falls back to the way in for an API that did not name hosts', () => {
    expect(hostName({ via: 'mcp' })).toBe('MCP');
    expect(hostName({ id: 'windsurf' as never, via: 'cli' })).toBe('CLI');
  });
});

describe('isHostId', () => {
  it('knows only the hosts the API tells apart', () => {
    expect(isHostId('opencode')).toBe(true);
    expect(isHostId('windsurf')).toBe(false);
    expect(isHostId('toString')).toBe(false);
    expect(isHostId(undefined)).toBe(false);
  });
});

describe('connectedHostIds', () => {
  it('checks each host that checked the inbox within the day, or connected within it and has not checked yet', () => {
    const status = statusWith([
      { id: 'claude-code', via: 'cli', connectedAt: ago(30 * 24 * HOUR), lastCheckedAt: ago(2 * HOUR) },
      { id: 'codex', via: 'cli', connectedAt: ago(3 * HOUR), lastCheckedAt: null },
      { id: 'chatgpt', via: 'mcp', connectedAt: ago(9 * 24 * HOUR), lastCheckedAt: ago(2 * 24 * HOUR) },
      { id: 'hermes', via: 'cli', connectedAt: ago(2 * 24 * HOUR), lastCheckedAt: null },
      { via: 'cli', connectedAt: ago(HOUR), lastCheckedAt: ago(HOUR) },
    ]);

    expect([...connectedHostIds(status.hosts, NOW)].sort()).toEqual(['claude-code', 'codex']);
  });

  it('adds the chat apps that signed in through the MCP server', () => {
    expect([...connectedHostIds(null, NOW, ['claude', 'cursor', 'not-a-host'])].sort()).toEqual(['claude', 'cursor']);
  });
});

describe('findNewHost', () => {
  const claudeCode: AgentHost = {
    id: 'claude-code',
    via: 'cli',
    connectedAt: ago(5 * HOUR),
    lastCheckedAt: ago(HOUR),
  };

  it('tells another host that comes in the way one already did', () => {
    const before = statusWith([claudeCode]);
    const after = statusWith([
      { id: 'codex', via: 'cli', connectedAt: ago(0), lastCheckedAt: null },
      { ...claudeCode, lastCheckedAt: ago(0) },
    ]);

    expect(findNewHost(before, after)).toBe('cli');
  });

  it('tells nothing for a host that keeps checking, and tells one that comes back after a day', () => {
    const checking = statusWith([{ ...claudeCode, lastCheckedAt: ago(0) }]);
    expect(findNewHost(statusWith([claudeCode]), checking)).toBe(null);

    const gone = statusWith([{ ...claudeCode, lastCheckedAt: ago(30 * HOUR) }]);
    expect(findNewHost(gone, checking)).toBe('cli');
  });

  it('still works with an API from before hosts had names', () => {
    const cli: AgentHost = { via: 'cli', connectedAt: ago(5 * HOUR), lastCheckedAt: ago(HOUR) };

    expect(findNewHost(statusWith([cli]), statusWith([{ ...cli, lastCheckedAt: ago(0) }]))).toBe(null);
    expect(
      findNewHost(statusWith([cli]), statusWith([cli, { via: 'mcp', connectedAt: ago(0), lastCheckedAt: null }]))
    ).toBe('mcp');
  });
});
