/**
 * Per-provider DCR OAuth strategy hooks.
 *
 * Contract:
 * - Return `null` (or omit a hook) to keep the generic flow's default behavior.
 * - The day-1 registry is intentionally empty — most DCR providers need only a
 *   catalog entry.
 * - Add a new hook only when a real provider forces it (review-gated).
 *
 * Onboarding checklist: `.cursor/skills/onboard-dcr-mcp/SKILL.md`
 */
import type { McpOAuthErrorCode } from '../mcp-oauth-discovery.service';

export type DcrTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export type DcrTokenExchangeErrorLogVariant = 'non_2xx' | 'inline_error' | 'malformed';

export type DcrTokenExchangeOutcome =
  | { kind: 'success'; tokens: DcrTokenResponse }
  | {
      kind: 'error';
      code: McpOAuthErrorCode;
      message: string;
      providerError?: string;
      logVariant: DcrTokenExchangeErrorLogVariant;
    };

export interface InterpretDcrTokenExchangeResponseArgs {
  statusCode: number;
  body: unknown;
  defaults: DcrTokenExchangeOutcome;
}

export interface DcrProviderStrategy {
  /**
   * Override how a DCR token-endpoint response is interpreted. Return `null`
   * to accept `defaults`.
   */
  interpretTokenExchangeResponse?(args: InterpretDcrTokenExchangeResponseArgs): DcrTokenExchangeOutcome | null;
}

export const DEFAULT_DCR_STRATEGY: DcrProviderStrategy = {
  interpretTokenExchangeResponse: () => null,
};
