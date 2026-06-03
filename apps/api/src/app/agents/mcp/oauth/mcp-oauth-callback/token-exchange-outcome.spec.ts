import { expect } from 'chai';

import { mapTokenExchangeErrorCode, resolveDcrTokenExchangeOutcome } from './token-exchange-outcome';

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
    expect(mapTokenExchangeErrorCode(401, 'Resource not accessible by integration')).to.equal(
      'mcp_token_exchange_failed'
    );
  });

  it('falls back to mcp_token_exchange_failed for unrecognised errors', () => {
    expect(mapTokenExchangeErrorCode(400, 'bad_verification_code')).to.equal('mcp_token_exchange_failed');
    expect(mapTokenExchangeErrorCode(400, 'invalid_grant')).to.equal('mcp_token_exchange_failed');
    expect(mapTokenExchangeErrorCode(500, undefined)).to.equal('mcp_token_exchange_failed');
  });

  it('does NOT map 404 to mcp_app_not_installed', () => {
    expect(mapTokenExchangeErrorCode(404, undefined)).to.equal('mcp_token_exchange_failed');
    expect(mapTokenExchangeErrorCode(404, 'not_found')).to.equal('mcp_token_exchange_failed');
  });
});

describe('resolveDcrTokenExchangeOutcome', () => {
  it('maps non-2xx responses to a token-exchange error outcome', () => {
    const outcome = resolveDcrTokenExchangeOutcome(400, { error: 'invalid_grant' });

    expect(outcome).to.deep.equal({
      kind: 'error',
      code: 'mcp_token_exchange_failed',
      message: 'Token exchange failed: invalid_grant',
      providerError: 'invalid_grant',
      logVariant: 'non_2xx',
      logMessage: 'MCP OAuth token exchange returned non-2xx',
      exceptionMessage: 'OAuth token exchange failed: invalid_grant',
    });
  });

  it('maps 2xx inline OAuth errors to an inline_error outcome', () => {
    const outcome = resolveDcrTokenExchangeOutcome(200, { error: 'bad_verification_code' });

    expect(outcome).to.deep.equal({
      kind: 'error',
      code: 'mcp_token_exchange_failed',
      message: 'Token exchange failed: bad_verification_code',
      providerError: 'bad_verification_code',
      logVariant: 'inline_error',
      logMessage: 'MCP OAuth token exchange returned 2xx with inline error',
      exceptionMessage: 'OAuth token exchange failed: bad_verification_code',
    });
  });

  it('maps malformed 2xx bodies to a malformed outcome', () => {
    const outcome = resolveDcrTokenExchangeOutcome(200, { token_type: 'Bearer' });

    expect(outcome).to.deep.equal({
      kind: 'error',
      code: 'mcp_token_exchange_failed',
      message: 'Token exchange returned a malformed response.',
      logVariant: 'malformed',
      logMessage: 'MCP OAuth token exchange returned a malformed 2xx body',
      exceptionMessage: 'OAuth token exchange returned a malformed response.',
    });
  });

  it('returns success tokens for a valid 2xx body', () => {
    const outcome = resolveDcrTokenExchangeOutcome(200, {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'read write',
    });

    expect(outcome).to.deep.equal({
      kind: 'success',
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write',
      },
    });
  });

  it('maps application_suspended on non-2xx to mcp_github_org_block', () => {
    const outcome = resolveDcrTokenExchangeOutcome(403, { error: 'application_suspended' });

    expect(outcome).to.deep.equal({
      kind: 'error',
      code: 'mcp_github_org_block',
      message: 'Token exchange failed: application_suspended',
      providerError: 'application_suspended',
      logVariant: 'non_2xx',
      logMessage: 'MCP OAuth token exchange returned non-2xx',
      exceptionMessage: 'OAuth token exchange failed: application_suspended',
    });
  });
});
