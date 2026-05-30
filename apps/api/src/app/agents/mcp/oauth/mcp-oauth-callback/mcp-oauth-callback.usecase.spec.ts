import { expect } from 'chai';

import {
  mapTokenExchangeErrorCode,
  mapUpstreamCallbackErrorCode,
  parseUpstreamErrorToken,
} from './mcp-oauth-callback.usecase';

describe('McpOAuthCallback error mapping helpers', () => {
  describe('parseUpstreamErrorToken', () => {
    it('returns undefined for blank or missing input', () => {
      expect(parseUpstreamErrorToken(undefined)).to.equal(undefined);
      expect(parseUpstreamErrorToken('')).to.equal(undefined);
      expect(parseUpstreamErrorToken('   ')).to.equal(undefined);
    });

    it('extracts the bare error token', () => {
      expect(parseUpstreamErrorToken('access_denied')).to.equal('access_denied');
    });

    it('extracts the head when the controller has glued in an error_description', () => {
      // Mirrors `${error}${errorDescription ? ` - ${errorDescription}` : ''}` from the controller.
      expect(parseUpstreamErrorToken('access_denied - The user cancelled the consent')).to.equal('access_denied');
    });

    it('trims surrounding whitespace before splitting', () => {
      expect(parseUpstreamErrorToken('   access_denied   ')).to.equal('access_denied');
    });
  });

  describe('mapUpstreamCallbackErrorCode', () => {
    it('maps access_denied to mcp_user_denied', () => {
      expect(mapUpstreamCallbackErrorCode('access_denied')).to.equal('mcp_user_denied');
    });

    it('falls back to oauth_callback_error for any unrecognised token', () => {
      expect(mapUpstreamCallbackErrorCode('server_error')).to.equal('oauth_callback_error');
      expect(mapUpstreamCallbackErrorCode('temporarily_unavailable')).to.equal('oauth_callback_error');
      expect(mapUpstreamCallbackErrorCode(undefined)).to.equal('oauth_callback_error');
    });
  });

  describe('mapTokenExchangeErrorCode', () => {
    it('maps access_denied to mcp_user_denied regardless of status', () => {
      expect(mapTokenExchangeErrorCode(400, 'access_denied')).to.equal('mcp_user_denied');
      expect(mapTokenExchangeErrorCode(200, 'access_denied')).to.equal('mcp_user_denied');
    });

    it('maps GitHub application_suspended and app_blocked to mcp_github_org_block', () => {
      expect(mapTokenExchangeErrorCode(403, 'application_suspended')).to.equal('mcp_github_org_block');
      expect(mapTokenExchangeErrorCode(403, 'app_blocked')).to.equal('mcp_github_org_block');
    });

    it('is case-insensitive on the provider error token', () => {
      expect(mapTokenExchangeErrorCode(403, 'APPLICATION_SUSPENDED')).to.equal('mcp_github_org_block');
      expect(mapTokenExchangeErrorCode(400, 'Access_Denied')).to.equal('mcp_user_denied');
    });

    it('maps 403 + "Resource not accessible by integration" message to mcp_github_org_block', () => {
      expect(mapTokenExchangeErrorCode(403, 'Resource not accessible by integration')).to.equal('mcp_github_org_block');
    });

    it('does NOT map 403 + "Resource not accessible by integration" when status is not 403', () => {
      // The substring match is gated on status to avoid spurious matches
      // against other 4xx responses that happen to mention the phrase.
      expect(mapTokenExchangeErrorCode(401, 'Resource not accessible by integration')).to.equal(
        'mcp_token_exchange_failed'
      );
    });

    it('falls back to mcp_token_exchange_failed for unrecognised errors', () => {
      expect(mapTokenExchangeErrorCode(400, 'bad_verification_code')).to.equal('mcp_token_exchange_failed');
      expect(mapTokenExchangeErrorCode(400, 'invalid_grant')).to.equal('mcp_token_exchange_failed');
      expect(mapTokenExchangeErrorCode(500, undefined)).to.equal('mcp_token_exchange_failed');
    });

    it('does NOT map 404 to mcp_app_not_installed (deliberately removed)', () => {
      // The token endpoint never 404s for missing org approval; we only
      // emit mcp_app_not_installed from a future disconnect/installation
      // probe (currently out of scope per the plan's Non-Goals).
      expect(mapTokenExchangeErrorCode(404, undefined)).to.equal('mcp_token_exchange_failed');
      expect(mapTokenExchangeErrorCode(404, 'not_found')).to.equal('mcp_token_exchange_failed');
    });
  });
});
