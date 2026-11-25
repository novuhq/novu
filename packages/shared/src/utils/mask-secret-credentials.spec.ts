import { describe, expect, it } from 'vitest';
import { ChatProviderIdEnum, EmailProviderIdEnum } from '../types';
import {
  isMaskedSecret,
  MASKED_SECRET_FILL,
  maskSecret,
  maskSecretCredentials,
  restoreMaskedCredentials,
} from './mask-secret-credentials';

const SENDGRID = EmailProviderIdEnum.SendGrid;
const API_KEY = 'SG.abcdefghijklmnop3f9a';

describe('maskSecret', () => {
  it('keeps the first 3 and last 4 characters', () => {
    expect(maskSecret(API_KEY)).toBe(`SG.${MASKED_SECRET_FILL}3f9a`);
  });

  it('shows only the last 4 characters of a short secret', () => {
    expect(maskSecret('hunter2024')).toBe(`${MASKED_SECRET_FILL}2024`);
  });

  it('shows nothing of a very short secret', () => {
    expect(maskSecret('hunter2')).toBe(MASKED_SECRET_FILL);
  });

  it('shows nothing of a JSON or multi-line secret', () => {
    expect(maskSecret('{"private_key":"abcdefghijklmnop"}')).toBe(MASKED_SECRET_FILL);
    expect(maskSecret('-----BEGIN KEY-----\nabcdefghijkl')).toBe(MASKED_SECRET_FILL);
  });

  it('masks secrets of different lengths to the same length', () => {
    expect(maskSecret('a'.repeat(20)).length).toBe(maskSecret('a'.repeat(200)).length);
  });
});

describe('maskSecretCredentials', () => {
  it('masks secrets and leaves settings readable', () => {
    const masked = maskSecretCredentials(SENDGRID, { apiKey: API_KEY, from: 'hello@acme.com', senderName: 'Acme' });

    expect(masked).toEqual({ apiKey: `SG.${MASKED_SECRET_FILL}3f9a`, from: 'hello@acme.com', senderName: 'Acme' });
  });

  it('leaves the WhatsApp webhook verify token readable', () => {
    const masked = maskSecretCredentials(ChatProviderIdEnum.WhatsAppBusiness, {
      apiToken: 'EAAGabcdefghijklmnop',
      token: 'verify-token-1234567890',
    });

    expect(isMaskedSecret(masked.apiToken)).toBe(true);
    expect(masked.token).toBe('verify-token-1234567890');
  });
});

describe('restoreMaskedCredentials', () => {
  const stored = { apiKey: API_KEY, from: 'hello@acme.com' };

  it('puts the stored secret back for an unchanged mask', () => {
    const sent = { ...maskSecretCredentials(SENDGRID, stored), from: 'support@acme.com' };

    expect(restoreMaskedCredentials(SENDGRID, sent, stored)).toEqual({
      credentials: { apiKey: API_KEY, from: 'support@acme.com' },
      unresolvedKeys: [],
    });
  });

  it('keeps a newly typed secret', () => {
    const { credentials } = restoreMaskedCredentials(SENDGRID, { apiKey: 'SG.new-key-0000000000' }, stored);

    expect(credentials.apiKey).toBe('SG.new-key-0000000000');
  });

  it('reports a mask that matches no stored secret', () => {
    const sent = { apiKey: `XX.${MASKED_SECRET_FILL}0000` };

    expect(restoreMaskedCredentials(SENDGRID, sent, stored).unresolvedKeys).toEqual(['apiKey']);
    expect(restoreMaskedCredentials(SENDGRID, sent, undefined).unresolvedKeys).toEqual(['apiKey']);
  });
});
