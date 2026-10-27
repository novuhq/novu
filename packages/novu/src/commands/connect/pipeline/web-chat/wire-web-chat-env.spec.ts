import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWebChatEnvEntries, isKnownScaffoldApiHost, mergeWebChatEnv } from './wire-web-chat-env';

const baseInput = {
  projectDir: '/tmp/project',
  applicationIdentifier: 'app-id',
  subscriberId: 'subscriber-id',
  agentIdentifier: 'agent-id',
};

describe('isKnownScaffoldApiHost', () => {
  it('is true for the US default, EU, staging, localhost, and Novu Box hosts', () => {
    expect(isKnownScaffoldApiHost('https://api.novu.co')).toBe(true);
    expect(isKnownScaffoldApiHost('https://eu.api.novu.co')).toBe(true);
    expect(isKnownScaffoldApiHost('https://api.novu-staging.co')).toBe(true);
    expect(isKnownScaffoldApiHost('http://localhost:3000')).toBe(true);
    expect(isKnownScaffoldApiHost('https://my-box-api.box.novu-staging.co')).toBe(true);
  });

  it('is false for unknown/self-hosted API hosts', () => {
    expect(isKnownScaffoldApiHost('https://api.my-company.com')).toBe(false);
    expect(isKnownScaffoldApiHost('not-a-url')).toBe(false);
  });

  it('agrees with buildWebChatEnvEntries on the US default host regardless of scheme/port', () => {
    for (const apiUrl of ['https://api.novu.co', 'http://api.novu.co', 'https://api.novu.co:443']) {
      expect(isKnownScaffoldApiHost(apiUrl)).toBe(true);
      expect(buildWebChatEnvEntries({ ...baseInput, apiUrl }).NEXT_PUBLIC_NOVU_BACKEND_URL).toBeUndefined();
    }
  });
});

describe('buildWebChatEnvEntries', () => {
  it('omits backend and socket URL entries for the US Cloud default', () => {
    const entries = buildWebChatEnvEntries({ ...baseInput, apiUrl: 'https://api.novu.co' });

    expect(entries.NEXT_PUBLIC_NOVU_BACKEND_URL).toBeUndefined();
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_URL).toBeUndefined();
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_TYPE).toBeUndefined();
  });

  it.each([
    { apiUrl: 'http://localhost:3000', socketUrl: 'ws://127.0.0.1:8787' },
    { apiUrl: 'https://api.novu.localhost', socketUrl: 'ws://127.0.0.1:8787' },
    { apiUrl: 'https://eu.api.novu.co', socketUrl: 'wss://eu.socket.novu.co' },
    { apiUrl: 'https://api.novu-staging.co', socketUrl: 'wss://socket.novu-staging.co' },
  ])('sets the socket URL for a known host ($apiUrl) without a socket type', ({ apiUrl, socketUrl }) => {
    const entries = buildWebChatEnvEntries({ ...baseInput, apiUrl });

    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_URL).toBe(socketUrl);
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_TYPE).toBeUndefined();
  });

  it('sets both the socket URL and socket type for a Novu Box host', () => {
    const entries = buildWebChatEnvEntries({ ...baseInput, apiUrl: 'https://my-box-api.box.novu-staging.co' });

    expect(entries.NEXT_PUBLIC_NOVU_BACKEND_URL).toBe('https://my-box-api.box.novu-staging.co');
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_URL).toBe('wss://my-box.box.novu-staging.co/ws');
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_TYPE).toBe('cloud');
  });

  it('does not set a socket URL or type for an unrecognised self-hosted API', () => {
    const entries = buildWebChatEnvEntries({ ...baseInput, apiUrl: 'https://api.my-company.com' });

    expect(entries.NEXT_PUBLIC_NOVU_BACKEND_URL).toBe('https://api.my-company.com');
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_URL).toBeUndefined();
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_TYPE).toBeUndefined();
  });
});

describe('mergeWebChatEnv', () => {
  it('clears a previously-written socket URL/type when re-run against a host that no longer has one', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-env-'));
    fs.writeFileSync(path.join(projectDir, '.env.local'), '');

    mergeWebChatEnv({ ...baseInput, projectDir, apiUrl: 'https://my-box-api.box.novu-staging.co' });
    const afterBoxRun = fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8');
    expect(afterBoxRun).toContain('NEXT_PUBLIC_NOVU_SOCKET_URL=wss://my-box.box.novu-staging.co/ws');
    expect(afterBoxRun).toContain('NEXT_PUBLIC_NOVU_SOCKET_TYPE=cloud');

    mergeWebChatEnv({ ...baseInput, projectDir, apiUrl: 'https://api.my-company.com' });
    const afterSelfHostedRun = fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8');
    expect(afterSelfHostedRun).toContain('NEXT_PUBLIC_NOVU_BACKEND_URL=https://api.my-company.com');
    expect(afterSelfHostedRun).not.toContain('NEXT_PUBLIC_NOVU_SOCKET_URL');
    expect(afterSelfHostedRun).not.toContain('NEXT_PUBLIC_NOVU_SOCKET_TYPE');
  });
});
