import { ForbiddenException } from '@nestjs/common';
import { expect } from 'chai';
import {
  assertLegacyChatOauthIntegrationHmacEnabled,
  resolveLegacyChatOauthHmacRequired,
} from './legacy-chat-oauth.config';

describe('legacy-chat-oauth.config', () => {
  describe('resolveLegacyChatOauthHmacRequired', () => {
    it('requires HMAC for new organizations by default', () => {
      expect(resolveLegacyChatOauthHmacRequired(true, false)).to.equal(true);
      expect(resolveLegacyChatOauthHmacRequired(true, true)).to.equal(true);
    });

    it('mirrors the integration HMAC setting for allowlisted legacy organizations', () => {
      expect(resolveLegacyChatOauthHmacRequired(false, false)).to.equal(false);
      expect(resolveLegacyChatOauthHmacRequired(false, true)).to.equal(true);
    });
  });

  describe('assertLegacyChatOauthIntegrationHmacEnabled', () => {
    it('blocks new organizations when the integration does not enable HMAC', () => {
      expect(() => assertLegacyChatOauthIntegrationHmacEnabled(true, false)).to.throw(ForbiddenException);
    });

    it('allows allowlisted legacy organizations without integration HMAC', () => {
      expect(() => assertLegacyChatOauthIntegrationHmacEnabled(false, false)).to.not.throw();
    });
  });
});
