import { describe, expect, it } from 'vitest';
import { channelIdFromThreadId, decodeThreadId, encodeThreadId, isDMThreadId } from './thread-id.js';
import type { NovuThreadId } from './types.js';

describe('thread-id', () => {
  const cases: NovuThreadId[] = [
    { platform: 'slack', integrationIdentifier: 'slack-prod', conversationId: '64f0a1b2c3d4e5f6', isDM: false },
    { platform: 'whatsapp', integrationIdentifier: 'wa-1', conversationId: 'abc123', isDM: true },
    { platform: 'email', integrationIdentifier: 'sendgrid:main', conversationId: 'id with spaces', isDM: false },
  ];

  it('round-trips encode -> decode', () => {
    for (const data of cases) {
      expect(decodeThreadId(encodeThreadId(data))).toEqual(data);
    }
  });

  it('derives channelId as novu:<platform>:<integrationIdentifier>', () => {
    const id = encodeThreadId(cases[0]!);
    expect(channelIdFromThreadId(id)).toBe('novu:slack:slack-prod');
  });

  it('reads isDM statelessly from the id', () => {
    expect(isDMThreadId(encodeThreadId(cases[1]!))).toBe(true);
    expect(isDMThreadId(encodeThreadId(cases[0]!))).toBe(false);
  });

  it('throws on malformed ids', () => {
    for (const bad of ['', 'novu', 'novu:slack', 'email:foo:bar', 'novu:slack:int::0']) {
      expect(() => decodeThreadId(bad)).toThrow();
    }
  });
});
