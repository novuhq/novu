import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { ensureWhatsAppManagedCredentials } from './whatsapp-credentials.utils';

describe('ensureWhatsAppManagedCredentials', () => {
  const existing = {
    apiToken: 'stored-access-token',
    secretKey: 'stored-app-secret',
    token: 'stored-verify-token',
    phoneNumberIdentification: 'phone-id-1',
    businessAccountId: 'waba-1',
  };

  it('returns next credentials unchanged for non-WhatsApp providers', () => {
    const next = { apiToken: 'new-token' };

    expect(
      ensureWhatsAppManagedCredentials({
        providerId: ChatProviderIdEnum.Slack,
        nextCredentials: next,
        existingCredentials: existing,
      })
    ).to.equal(next);
  });

  it('merges a stamp-only patch over existing credentials without wiping secrets', () => {
    const stamp = '2026-07-12T00:00:00.000Z';
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { whatsNextCompletedAt: stamp },
      existingCredentials: existing,
    });

    expect(result).to.deep.include({
      ...existing,
      whatsNextCompletedAt: stamp,
    });
  });

  it('restores apiToken when the patch sends an empty string', () => {
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { apiToken: '', phoneNumberIdentification: 'phone-id-2' },
      existingCredentials: existing,
    });

    expect(result.apiToken).to.equal(existing.apiToken);
    expect(result.phoneNumberIdentification).to.equal('phone-id-2');
    expect(result.secretKey).to.equal(existing.secretKey);
  });

  it('allows rotating apiToken when a non-empty value is supplied', () => {
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { apiToken: 'permanent-system-user-token' },
      existingCredentials: existing,
    });

    expect(result.apiToken).to.equal('permanent-system-user-token');
    expect(result.token).to.equal(existing.token);
    expect(result.phoneNumberIdentification).to.equal(existing.phoneNumberIdentification);
  });

  it('auto-fills verify token on first save when missing', () => {
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { apiToken: 'first-token' },
    });

    expect(result.apiToken).to.equal('first-token');
    expect(result.token).to.be.a('string').and.not.empty;
  });

  it('preserves existing verify token when the patch omits it', () => {
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { apiToken: 'rotated-token' },
      existingCredentials: existing,
    });

    expect(result.token).to.equal(existing.token);
  });

  it('drops a client-supplied isNovuManaged flag when not explicitly allowed', () => {
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { apiToken: 'client-token', isNovuManaged: true },
      existingCredentials: existing,
    });

    expect(result.isNovuManaged).to.be.undefined;
  });

  it('preserves the stored isNovuManaged flag against client tampering', () => {
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { apiToken: 'client-token', isNovuManaged: false },
      existingCredentials: { ...existing, isNovuManaged: true },
    });

    expect(result.isNovuManaged).to.equal(true);
  });

  it('allows the trusted embedded-signup flow to set isNovuManaged', () => {
    const result = ensureWhatsAppManagedCredentials({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      nextCredentials: { apiToken: 'server-token', isNovuManaged: true },
      existingCredentials: existing,
      allowManagedFlagChange: true,
    });

    expect(result.isNovuManaged).to.equal(true);
  });
});
