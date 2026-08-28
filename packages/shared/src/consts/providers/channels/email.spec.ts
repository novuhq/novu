import { describe, expect, it } from 'vitest';
import { CredentialsKeyEnum } from '../../../types';
import { emailWebhookConfig } from '../credentials';

describe('emailProviders credentials', () => {
  it('shapes emailWebhookConfig with an optional HMAC secret key encoding dropdown defaulting to text', () => {
    expect(emailWebhookConfig.map((credential) => credential.key)).toEqual([
      CredentialsKeyEnum.WebhookUrl,
      CredentialsKeyEnum.SecretKey,
      CredentialsKeyEnum.HmacSecretKeyEncoding,
      CredentialsKeyEnum.From,
      CredentialsKeyEnum.SenderName,
    ]);

    const encoding = emailWebhookConfig.find(
      (credential) => credential.key === CredentialsKeyEnum.HmacSecretKeyEncoding
    );

    expect(encoding?.required).toBe(false);
    expect(encoding?.value).toBe('text');
    expect(encoding?.dropdown).toEqual([
      { name: 'Text', value: 'text' },
      { name: 'Base-64', value: 'base64' },
      { name: 'HEX', value: 'hex' },
    ]);
  });
});
