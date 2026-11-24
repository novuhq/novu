import { describe, expect, it } from 'vitest';
import { ChannelTypeEnum, CredentialsKeyEnum, EmailProviderIdEnum } from '../../../types';
import { birdEmailConfig, emailWebhookConfig } from '../credentials';
import { PROVIDER_ID_TO_CHANNEL_MAP, providers } from '../providers';
import { emailProviders } from './email';

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

describe('bird email provider registry', () => {
  it('uses bird-email as the provider id', () => {
    expect(EmailProviderIdEnum.Bird).toBe('bird-email');
  });

  it('shapes birdEmailConfig with an API key plus the shared mail base', () => {
    expect(birdEmailConfig.map((credential) => credential.key)).toEqual([
      CredentialsKeyEnum.ApiKey,
      CredentialsKeyEnum.From,
      CredentialsKeyEnum.SenderName,
    ]);
  });

  it('registers Bird in the Integration Store email list', () => {
    const entry = emailProviders.find((provider) => provider.id === EmailProviderIdEnum.Bird);

    expect(entry).toEqual(
      expect.objectContaining({
        displayName: 'Bird',
        channel: ChannelTypeEnum.EMAIL,
        logoFileName: { light: 'bird-email.svg', dark: 'bird-email.svg' },
      })
    );
    expect(entry?.docReference).toContain('/email/bird');
    expect(providers.map((provider) => provider.id)).toContain(EmailProviderIdEnum.Bird);
    expect(PROVIDER_ID_TO_CHANNEL_MAP[EmailProviderIdEnum.Bird]).toBe(ChannelTypeEnum.EMAIL);
  });
});
