import { describe, expect, it } from 'vitest';
import {
  buildSenderConfigSavePayload,
  deriveFieldLinkState,
  deriveUseProviderDefaults,
  isValidSenderEmail,
} from './sender-config-drawer.utils';

describe('sender-config-drawer.utils', () => {
  describe('isValidSenderEmail', () => {
    it('allows empty, liquid, and valid emails', () => {
      expect(isValidSenderEmail('')).toBe(true);
      expect(isValidSenderEmail('{{payload.email}}')).toBe(true);
      expect(isValidSenderEmail('noreply@acme.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidSenderEmail('not-an-email')).toBe(false);
    });
  });

  describe('deriveUseProviderDefaults', () => {
    it('uses explicit flag when an agent is assigned', () => {
      expect(
        deriveUseProviderDefaults({
          hasAgent: true,
          useProviderDefaults: true,
          fromEmail: undefined,
          fromName: undefined,
        })
      ).toBe(true);

      expect(
        deriveUseProviderDefaults({
          hasAgent: true,
          useProviderDefaults: undefined,
          fromEmail: undefined,
          fromName: undefined,
        })
      ).toBe(false);
    });

    it('treats schema-hydrated empty values as unset', () => {
      expect(
        deriveUseProviderDefaults({
          hasAgent: false,
          useProviderDefaults: false,
          fromEmail: '',
          fromName: '',
        })
      ).toBe(true);
    });

    it('falls back to unset from fields when no agent', () => {
      expect(
        deriveUseProviderDefaults({
          hasAgent: false,
          useProviderDefaults: undefined,
          fromEmail: undefined,
          fromName: undefined,
        })
      ).toBe(true);

      expect(
        deriveUseProviderDefaults({
          hasAgent: false,
          useProviderDefaults: undefined,
          fromEmail: 'a@b.com',
          fromName: undefined,
        })
      ).toBe(false);
    });
  });

  describe('deriveFieldLinkState', () => {
    it('links unset fields only when agent assigned and not using provider defaults', () => {
      expect(
        deriveFieldLinkState({
          hasAgent: true,
          useProviderDefaults: false,
          fromEmail: undefined,
          fromName: 'Custom',
          replyTo: undefined,
        })
      ).toEqual({
        nameLinked: false,
        emailLinked: true,
        replyToLinked: true,
      });
    });

    it('keeps reply-to linked while provider defaults own sender name and email', () => {
      expect(
        deriveFieldLinkState({
          hasAgent: true,
          useProviderDefaults: true,
          fromEmail: undefined,
          fromName: undefined,
          replyTo: undefined,
        })
      ).toEqual({
        nameLinked: false,
        emailLinked: false,
        replyToLinked: true,
      });
    });

    it('keeps fields linked when saved values are hydrated as empty strings', () => {
      expect(
        deriveFieldLinkState({
          hasAgent: true,
          useProviderDefaults: false,
          fromEmail: '',
          fromName: '',
          replyTo: '',
        })
      ).toEqual({
        nameLinked: true,
        emailLinked: true,
        replyToLinked: true,
      });
    });
  });

  describe('buildSenderConfigSavePayload', () => {
    it('stores useProviderDefaults and clears from when toggle is on', () => {
      expect(
        buildSenderConfigSavePayload({
          hasAgent: true,
          useProviderDefaults: true,
          linkState: { nameLinked: false, emailLinked: false, replyToLinked: true },
          localName: 'Ignored',
          localEmail: 'ignored@acme.com',
          localReplyTo: '',
          localPreheader: 'Hello',
        })
      ).toEqual({
        useProviderDefaults: true,
        from: undefined,
        replyTo: undefined,
        preheader: 'Hello',
      });
    });

    it('persists only unlinked overrides when agent-linked', () => {
      expect(
        buildSenderConfigSavePayload({
          hasAgent: true,
          useProviderDefaults: false,
          linkState: { nameLinked: true, emailLinked: false, replyToLinked: false },
          localName: '',
          localEmail: 'override@acme.com',
          localReplyTo: 'agent@inbox.com',
          localPreheader: '',
        })
      ).toEqual({
        useProviderDefaults: false,
        from: { email: 'override@acme.com' },
        replyTo: 'agent@inbox.com',
        preheader: undefined,
      });
    });
  });
});
