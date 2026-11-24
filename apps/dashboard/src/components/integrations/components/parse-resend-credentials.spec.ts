import { CredentialsKeyEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { isLikelyResendCredentialsBlock, parseResendCredentials } from './parse-resend-credentials';

const KEY = 're_8f2cAbCdEf123456';

describe('isLikelyResendCredentialsBlock', () => {
  it('leaves a bare key or address to the field it was pasted into', () => {
    expect(isLikelyResendCredentialsBlock(KEY)).toBe(false);
    expect(isLikelyResendCredentialsBlock(`  ${KEY}\n`)).toBe(false);
    expect(isLikelyResendCredentialsBlock('hello@acme.com')).toBe(false);
  });

  it('recognises a key inside an assignment or a multi-line block', () => {
    expect(isLikelyResendCredentialsBlock(`RESEND_API_KEY=${KEY}`)).toBe(true);
    expect(isLikelyResendCredentialsBlock(`${KEY}\nhello@acme.com`)).toBe(true);
  });

  it('ignores blocks without a Resend key', () => {
    expect(isLikelyResendCredentialsBlock('EMAIL_FROM=hello@acme.com\nFOO=bar')).toBe(false);
  });
});

describe('parseResendCredentials', () => {
  it('reads the key, address and name from a .env block', () => {
    expect(parseResendCredentials(`RESEND_API_KEY=${KEY}\nEMAIL_FROM="Acme <hello@acme.com>"`)).toEqual({
      [CredentialsKeyEnum.ApiKey]: KEY,
      [CredentialsKeyEnum.From]: 'hello@acme.com',
      [CredentialsKeyEnum.SenderName]: 'Acme',
    });
  });

  it('handles export, quotes, spaces and inline comments', () => {
    const text = [`export RESEND_API_KEY = '${KEY}'`, 'RESEND_FROM_EMAIL=hello@acme.com # prod sender'].join('\n');

    expect(parseResendCredentials(text)).toEqual({
      [CredentialsKeyEnum.ApiKey]: KEY,
      [CredentialsKeyEnum.From]: 'hello@acme.com',
    });
  });

  it('prefers a dedicated name variable over the name inside the address', () => {
    const text = [`RESEND_API_KEY=${KEY}`, 'EMAIL_FROM="Acme <hello@acme.com>"', 'EMAIL_FROM_NAME="Acme Billing"'].join(
      '\n'
    );

    expect(parseResendCredentials(text)[CredentialsKeyEnum.SenderName]).toBe('Acme Billing');
  });

  it('ignores addresses in variables that do not name a sender', () => {
    expect(parseResendCredentials(`RESEND_API_KEY=${KEY}\nADMIN_EMAIL=root@acme.com`)).toEqual({
      [CredentialsKeyEnum.ApiKey]: KEY,
    });
  });

  it('skips commented-out lines, so an old key above the current one is not used', () => {
    const text = ['# RESEND_API_KEY=re_oldRevokedKey0000', `RESEND_API_KEY=${KEY}`, '# EMAIL_FROM=old@acme.com'].join(
      '\n'
    );

    expect(parseResendCredentials(text)).toEqual({ [CredentialsKeyEnum.ApiKey]: KEY });
  });

  it('keeps a # inside quotes and drops a comment after the closing quote', () => {
    const text = [`RESEND_API_KEY="${KEY}" # prod`, 'SENDER_NAME="Acme #1" # billing'].join('\n');

    expect(parseResendCredentials(text)).toEqual({
      [CredentialsKeyEnum.ApiKey]: KEY,
      [CredentialsKeyEnum.SenderName]: 'Acme #1',
    });
  });

  it('returns nothing for unrelated text', () => {
    expect(parseResendCredentials('DATABASE_URL=postgres://localhost')).toEqual({});
  });
});
