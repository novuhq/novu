import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildWebChatEnvEntries,
  isKnownScaffoldApiHost,
  mergeWebChatEnv,
  resolveUnknownSocketHostWarning,
} from './wire-web-chat-env';

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
  it('keeps a manually-set socket URL when re-run against the same unrecognised host', () => {
    // Regression test: re-running connect against an unrecognised host used to delete any
    // socket URL already in the file — including one the user set by hand after a previous
    // unknownSocketHost warning — even though the API host hadn't changed. See NV-9195.
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-env-'));
    fs.writeFileSync(
      path.join(projectDir, '.env.local'),
      'NEXT_PUBLIC_NOVU_BACKEND_URL=https://api.my-company.com\nNEXT_PUBLIC_NOVU_SOCKET_URL=wss://chat.my-company.com\n'
    );

    mergeWebChatEnv({ ...baseInput, projectDir, apiUrl: 'https://api.my-company.com' });
    const afterRerun = fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8');
    expect(afterRerun).toContain('NEXT_PUBLIC_NOVU_SOCKET_URL=wss://chat.my-company.com');
  });

  it('clears a stale socket URL/type when re-run against a different, unrecognised host', () => {
    // Regression test: a socket URL/type inferred for a prior known host (e.g. a Novu Box)
    // must not survive a switch to a different, unrecognised host — otherwise Web Chat keeps
    // connecting to the old deployment and resolveUnknownSocketHostWarning never fires because
    // a socket URL still appears to be configured. See NV-9195.
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
    expect(resolveUnknownSocketHostWarning('https://api.my-company.com', projectDir)).toBe(true);
  });

  it('clears a stale socket URL/type when re-run against a different known host', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-env-'));
    fs.writeFileSync(path.join(projectDir, '.env.local'), '');

    mergeWebChatEnv({ ...baseInput, projectDir, apiUrl: 'https://my-box-api.box.novu-staging.co' });

    mergeWebChatEnv({ ...baseInput, projectDir, apiUrl: 'https://eu.api.novu.co' });
    const afterEuRun = fs.readFileSync(path.join(projectDir, '.env.local'), 'utf8');
    expect(afterEuRun).toContain('NEXT_PUBLIC_NOVU_SOCKET_URL=wss://eu.socket.novu.co');
    expect(afterEuRun).not.toContain('NEXT_PUBLIC_NOVU_SOCKET_TYPE');
  });
});

describe('resolveUnknownSocketHostWarning', () => {
  it('warns for an unrecognised host with no socket URL configured yet', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-env-'));

    expect(resolveUnknownSocketHostWarning('https://api.my-company.com', projectDir)).toBe(true);
  });

  it('does not warn once a socket URL is present, even for an unrecognised host', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-env-'));
    fs.writeFileSync(path.join(projectDir, '.env.local'), 'NEXT_PUBLIC_NOVU_SOCKET_URL=wss://chat.my-company.com\n');

    expect(resolveUnknownSocketHostWarning('https://api.my-company.com', projectDir)).toBe(false);
  });

  it('does not warn for a known host regardless of env file state', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-env-'));

    expect(resolveUnknownSocketHostWarning('https://api.novu.co', projectDir)).toBe(false);
  });
});
