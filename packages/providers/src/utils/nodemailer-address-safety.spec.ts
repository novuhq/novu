import { describe, expect, test } from 'vitest';
import {
  assertSafeNodemailerAddressHeader,
  assertSafeSendMailOptionsForNodemailerDos,
} from './nodemailer-address-safety';

function buildDeepGroup(depth: number): string {
  const parts: string[] = [];
  for (let i = 0; i < depth; i++) {
    parts.push(`g${i}:`);
  }

  return `${parts.join(' ')} user@example.com;`;
}

describe('nodemailer-address-safety', () => {
  test('allows normal addresses', () => {
    expect(() => assertSafeNodemailerAddressHeader('Team <team@example.com>, other@example.com')).not.toThrow();
  });

  test('rejects malicious nested group depth (issue #578)', () => {
    const payload = buildDeepGroup(3000);

    expect(() => assertSafeNodemailerAddressHeader(payload)).toThrow(/exceeds safe complexity/);
  });

  test('sendMail options: rejects attack in to', () => {
    expect(() =>
      assertSafeSendMailOptionsForNodemailerDos({
        to: buildDeepGroup(3000),
      })
    ).toThrow(/exceeds safe complexity/);
  });

  test('sendMail options: rejects attack in custom To header', () => {
    expect(() =>
      assertSafeSendMailOptionsForNodemailerDos({
        headers: {
          To: buildDeepGroup(3000),
        },
      })
    ).toThrow(/exceeds safe complexity/);
  });

  test('sendMail options: rejects attack in envelope.to as string array', () => {
    expect(() =>
      assertSafeSendMailOptionsForNodemailerDos({
        envelope: {
          from: 'bounce@example.com',
          to: ['safe@example.com', buildDeepGroup(3000)],
        },
      })
    ).toThrow(/exceeds safe complexity/);
  });
});
