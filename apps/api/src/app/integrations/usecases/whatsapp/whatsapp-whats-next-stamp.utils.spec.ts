import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { maybeStampWhatsNextCompletedAt, shouldStampWhatsNextCompletedAt } from './whatsapp-whats-next-stamp.utils';

describe('whatsapp-whats-next-stamp.utils', () => {
  const existingApiToken = 'existing-access-token';
  const nextApiToken = 'permanent-system-user-token';

  describe('shouldStampWhatsNextCompletedAt', () => {
    it('returns true when WhatsApp Business apiToken changes and stamp is unset', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: { apiToken: existingApiToken },
          nextCredentials: { apiToken: nextApiToken, token: 'verify-token' },
        })
      ).to.equal(true);
    });

    it('returns false for non-WhatsApp providers', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.Slack,
          existingCredentials: { apiToken: existingApiToken },
          nextCredentials: { apiToken: nextApiToken },
        })
      ).to.equal(false);
    });

    it('returns false when apiToken is absent from the patch (webhook-only / other fields)', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: { apiToken: existingApiToken, token: 'verify-token' },
          nextCredentials: { token: 'verify-token', phoneNumberIdentification: '123' },
        })
      ).to.equal(false);
    });

    it('returns false when apiToken is an empty string (partial form save)', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: { apiToken: existingApiToken },
          nextCredentials: { apiToken: '', phoneNumberIdentification: '123' },
        })
      ).to.equal(false);
    });

    it('returns false on first-time apiToken save (Layer-1 setup, no prior token)', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: { token: 'verify-token' },
          nextCredentials: { apiToken: nextApiToken, token: 'verify-token' },
        })
      ).to.equal(false);
    });

    it('returns false when only the webhook Verify Token (token) changes', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: { apiToken: existingApiToken, token: 'old-verify' },
          nextCredentials: { apiToken: existingApiToken, token: 'new-verify' },
        })
      ).to.equal(false);
    });

    it('returns false when apiToken is unchanged', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: { apiToken: existingApiToken },
          nextCredentials: { apiToken: existingApiToken },
        })
      ).to.equal(false);
    });

    it('returns false when whatsNextCompletedAt is already set on existing credentials', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: {
            apiToken: existingApiToken,
            whatsNextCompletedAt: '2026-01-01T00:00:00.000Z',
          },
          nextCredentials: { apiToken: nextApiToken },
        })
      ).to.equal(false);
    });

    it('returns false when the client already sent whatsNextCompletedAt', () => {
      expect(
        shouldStampWhatsNextCompletedAt({
          providerId: ChatProviderIdEnum.WhatsAppBusiness,
          existingCredentials: { apiToken: existingApiToken },
          nextCredentials: {
            apiToken: nextApiToken,
            whatsNextCompletedAt: '2026-06-01T12:00:00.000Z',
          },
        })
      ).to.equal(false);
    });
  });

  describe('maybeStampWhatsNextCompletedAt', () => {
    it('stamps whatsNextCompletedAt as an ISO string when conditions are met', () => {
      const result = maybeStampWhatsNextCompletedAt({
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        existingCredentials: { apiToken: existingApiToken },
        nextCredentials: { apiToken: nextApiToken, token: 'verify-token' },
      });

      expect(result.apiToken).to.equal(nextApiToken);
      expect(result.token).to.equal('verify-token');
      expect(result.whatsNextCompletedAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
      expect(Number.isNaN(Date.parse(result.whatsNextCompletedAt!))).to.equal(false);
    });

    it('preserves a client-provided stamp (manual confirm)', () => {
      const clientStamp = '2026-06-15T10:00:00.000Z';
      const result = maybeStampWhatsNextCompletedAt({
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        existingCredentials: { apiToken: existingApiToken },
        nextCredentials: { apiToken: nextApiToken, whatsNextCompletedAt: clientStamp },
      });

      expect(result.whatsNextCompletedAt).to.equal(clientStamp);
    });

    it('preserves an existing stamp when already set (idempotent)', () => {
      const existingStamp = '2026-01-01T00:00:00.000Z';
      const result = maybeStampWhatsNextCompletedAt({
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        existingCredentials: {
          apiToken: existingApiToken,
          whatsNextCompletedAt: existingStamp,
        },
        nextCredentials: { apiToken: nextApiToken },
      });

      expect(result.whatsNextCompletedAt).to.equal(existingStamp);
    });

    it('does not stamp when apiToken is absent', () => {
      const result = maybeStampWhatsNextCompletedAt({
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        existingCredentials: { apiToken: existingApiToken, token: 'verify-token' },
        nextCredentials: { token: 'verify-token' },
      });

      expect(result.whatsNextCompletedAt).to.equal(undefined);
    });
  });
});
