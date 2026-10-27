import { describe, expect, it } from 'vitest';
import { buildWebChatEnvEntries, isKnownScaffoldApiHost, resolveScaffoldSocketUrl } from './wire-web-chat-env';

describe('resolveScaffoldSocketUrl', () => {
  it('resolves localhost and *.novu.localhost to the local dev socket', () => {
    expect(resolveScaffoldSocketUrl('http://localhost:3000')).toBe('ws://127.0.0.1:8787');
    expect(resolveScaffoldSocketUrl('http://127.0.0.1:3000')).toBe('ws://127.0.0.1:8787');
    expect(resolveScaffoldSocketUrl('https://api.novu.localhost')).toBe('ws://127.0.0.1:8787');
  });

  it('resolves the EU and staging API hosts to their sockets', () => {
    expect(resolveScaffoldSocketUrl('https://eu.api.novu.co')).toBe('wss://eu.socket.novu.co');
    expect(resolveScaffoldSocketUrl('https://api.novu-staging.co')).toBe('wss://socket.novu-staging.co');
  });

  it('resolves US Cloud default to no socket override (SDK default applies)', () => {
    expect(resolveScaffoldSocketUrl('https://api.novu.co')).toBeUndefined();
  });

  it('maps a Novu Box API host to its socket URL', () => {
    expect(resolveScaffoldSocketUrl('https://my-box-api.box.novu-staging.co')).toBe(
      'wss://my-box.box.novu-staging.co/ws'
    );
  });

  it('returns undefined for unrecognised self-hosted API hosts', () => {
    expect(resolveScaffoldSocketUrl('https://api.my-company.com')).toBeUndefined();
  });

  it('returns undefined for an invalid URL', () => {
    expect(resolveScaffoldSocketUrl('not-a-url')).toBeUndefined();
  });
});

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
});

describe('buildWebChatEnvEntries', () => {
  const baseInput = {
    projectDir: '/tmp/project',
    applicationIdentifier: 'app-id',
    subscriberId: 'subscriber-id',
    agentIdentifier: 'agent-id',
  };

  it('omits backend and socket URL entries for the US Cloud default', () => {
    const entries = buildWebChatEnvEntries({ ...baseInput, apiUrl: 'https://api.novu.co' });

    expect(entries.NEXT_PUBLIC_NOVU_BACKEND_URL).toBeUndefined();
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_URL).toBeUndefined();
    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_TYPE).toBeUndefined();
  });

  it('sets the socket URL for a known host without a socket type', () => {
    const entries = buildWebChatEnvEntries({ ...baseInput, apiUrl: 'https://eu.api.novu.co' });

    expect(entries.NEXT_PUBLIC_NOVU_SOCKET_URL).toBe('wss://eu.socket.novu.co');
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
