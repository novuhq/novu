import { MCP_SERVERS, McpConnectionAuthModeEnum } from '@novu/shared';
import { expect } from 'chai';

import { DEFAULT_DCR_STRATEGY } from './dcr-provider-strategy';
import {
  dcrProviderStrategyRegistry,
  listRegisteredDcrProviderStrategyIds,
  resolveDcrProviderStrategy,
} from './dcr-provider-strategy-registry';
import { resolveDefaultDcrTokenExchangeOutcome } from './resolve-default-dcr-token-exchange-outcome';

describe('DcrProviderStrategy', () => {
  describe('DEFAULT_DCR_STRATEGY', () => {
    it('returns null from interpretTokenExchangeResponse so defaults are kept', () => {
      const defaults = resolveDefaultDcrTokenExchangeOutcome(200, {
        access_token: 'token',
        token_type: 'Bearer',
      });

      expect(
        DEFAULT_DCR_STRATEGY.interpretTokenExchangeResponse?.({
          statusCode: 200,
          body: { access_token: 'token', token_type: 'Bearer' },
          defaults,
        })
      ).to.equal(null);
    });
  });

  describe('resolveDcrProviderStrategy', () => {
    it('returns DEFAULT_DCR_STRATEGY for unknown mcpId values', () => {
      expect(resolveDcrProviderStrategy('not-a-real-mcp-id')).to.equal(DEFAULT_DCR_STRATEGY);
    });
  });

  describe('dcrProviderStrategyRegistry', () => {
    it('registers only strategies for existing DCR catalog entries', () => {
      const dcrIds = new Set(
        MCP_SERVERS.filter((entry) => entry.oauth?.mode === McpConnectionAuthModeEnum.Dcr).map((entry) => entry.id)
      );

      for (const mcpId of listRegisteredDcrProviderStrategyIds()) {
        expect(dcrIds.has(mcpId), `orphan strategy registered for "${mcpId}"`).to.equal(true);
      }
    });

    it('starts empty on day one', () => {
      expect(dcrProviderStrategyRegistry.size).to.equal(0);
    });
  });

  describe('resolveDefaultDcrTokenExchangeOutcome', () => {
    it('maps non-2xx responses to a token-exchange error outcome', () => {
      const outcome = resolveDefaultDcrTokenExchangeOutcome(400, { error: 'invalid_grant' });

      expect(outcome).to.deep.equal({
        kind: 'error',
        code: 'mcp_token_exchange_failed',
        message: 'Token exchange failed: invalid_grant',
        providerError: 'invalid_grant',
        logVariant: 'non_2xx',
      });
    });

    it('maps 2xx inline OAuth errors to an inline_error outcome', () => {
      const outcome = resolveDefaultDcrTokenExchangeOutcome(200, { error: 'bad_verification_code' });

      expect(outcome).to.deep.equal({
        kind: 'error',
        code: 'mcp_token_exchange_failed',
        message: 'Token exchange failed: bad_verification_code',
        providerError: 'bad_verification_code',
        logVariant: 'inline_error',
      });
    });

    it('maps malformed 2xx bodies to a malformed outcome', () => {
      const outcome = resolveDefaultDcrTokenExchangeOutcome(200, { token_type: 'Bearer' });

      expect(outcome).to.deep.equal({
        kind: 'error',
        code: 'mcp_token_exchange_failed',
        message: 'Token exchange returned a malformed response.',
        logVariant: 'malformed',
      });
    });

    it('returns success tokens for a valid 2xx body', () => {
      const outcome = resolveDefaultDcrTokenExchangeOutcome(200, {
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

    it('keeps the default outcome when no provider strategy is registered', () => {
      const defaults = resolveDefaultDcrTokenExchangeOutcome(403, { error: 'application_suspended' });
      const strategy = resolveDcrProviderStrategy('sentry');
      const outcome = strategy.interpretTokenExchangeResponse?.({
        statusCode: 403,
        body: { error: 'application_suspended' },
        defaults,
      });

      expect(outcome).to.equal(null);
      expect(defaults).to.deep.equal({
        kind: 'error',
        code: 'mcp_github_org_block',
        message: 'Token exchange failed: application_suspended',
        providerError: 'application_suspended',
        logVariant: 'non_2xx',
      });
    });
  });
});
