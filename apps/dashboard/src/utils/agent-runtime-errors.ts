import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';

export type AgentRuntimeErrorCode =
  | 'AGENT_RUNTIME_UNAUTHORIZED'
  | 'AGENT_RUNTIME_FORBIDDEN'
  | 'AGENT_RUNTIME_DRIFT'
  | 'AGENT_RUNTIME_RATE_LIMITED'
  | 'AGENT_RUNTIME_SERVICE_UNAVAILABLE'
  | 'AGENT_RUNTIME_BAD_REQUEST'
  | 'AGENT_RUNTIME_UPSTREAM_ERROR'
  | 'AGENT_RUNTIME_UNKNOWN';

export type AgentRuntimeUiTreatment = 'page-banner' | 'section-alert' | 'toast' | 'drift-modal';

export type AgentRuntimeErrorUiSpec = {
  /** Primary surface where this error is rendered */
  treatment: AgentRuntimeUiTreatment;
  /** Short, user-facing copy */
  title: string;
  /** Longer message, may contain a countdown placeholder {countdown} */
  description: string;
  /** Label for the primary action button */
  actionLabel?: string;
  /** Whether the section panel content should be replaced by the error */
  replaceContent?: boolean;
};

export function getAgentRuntimeErrorUiSpec(code: string, retryAfterMs?: number): AgentRuntimeErrorUiSpec {
  switch (code) {
    case 'AGENT_RUNTIME_UNAUTHORIZED':
      return {
        treatment: 'page-banner',
        title: 'Anthropic API key invalid',
        description: 'The Anthropic API key is invalid or was revoked. Re-connect to continue.',
        actionLabel: 'Update key',
        replaceContent: false,
      };

    case 'AGENT_RUNTIME_FORBIDDEN':
      return {
        treatment: 'section-alert',
        title: 'Access denied',
        description: "This Anthropic key doesn't have access to the required workspace.",
        actionLabel: 'View integration',
        replaceContent: true,
      };

    case 'AGENT_RUNTIME_DRIFT':
      return {
        treatment: 'drift-modal',
        title: 'Agent not found on Anthropic',
        description: 'This agent no longer exists on Anthropic. It may have been deleted upstream.',
        actionLabel: 'Recreate',
        replaceContent: false,
      };

    case 'AGENT_RUNTIME_RATE_LIMITED': {
      const countdownSec = retryAfterMs ? Math.ceil(retryAfterMs / 1000) : '…';

      return {
        treatment: 'section-alert',
        title: 'Rate limited',
        description: `Anthropic is rate-limiting requests. Retrying in ${countdownSec}s.`,
        actionLabel: 'Retry now',
        replaceContent: true,
      };
    }

    case 'AGENT_RUNTIME_SERVICE_UNAVAILABLE':
      return {
        treatment: 'section-alert',
        title: 'Anthropic unavailable',
        description: "Anthropic is currently unavailable. Some agent settings can't be loaded.",
        actionLabel: 'Retry',
        replaceContent: true,
      };

    case 'AGENT_RUNTIME_BAD_REQUEST':
      return {
        treatment: 'toast',
        title: 'Invalid request',
        description: 'The request was rejected by Anthropic. Check your inputs.',
        replaceContent: false,
      };

    default:
      return {
        treatment: 'section-alert',
        title: 'Something went wrong',
        description: 'Something went wrong talking to Anthropic. Our team has been notified.',
        actionLabel: 'Retry',
        replaceContent: true,
      };
  }
}

/**
 * Returns the status page URL for a given provider ID from the static catalog.
 * Returns undefined if the provider has no status URL configured.
 */
export function getProviderStatusUrl(providerId: string): string | undefined {
  return AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === providerId)?.statusUrl;
}

/**
 * Extracts an AgentRuntimeErrorCode from an API error response body.
 * Accepts either a raw error object (from `NovuApiError` responses) or a string code.
 */
export function extractRuntimeErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as Record<string, unknown>;

  if (typeof err.code === 'string') return err.code;
  if (typeof err.message === 'string' && err.message.startsWith('AGENT_RUNTIME_')) return err.message;

  return undefined;
}

/**
 * Determines whether a TanStack Query error should be retried.
 *
 * Rules (from the plan, section 9.4):
 * - No retry for 401, 403, 400, 409 errors
 * - Honour Retry-After on 429 (1 retry with delay)
 * - 2 retries for 503 / network / timeout errors
 */
export function agentRuntimeRetryDecision(failureCount: number, error: unknown): boolean {
  if (!error || typeof error !== 'object') return failureCount < 2;

  const err = error as Record<string, unknown>;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 0;
  const code = typeof err.code === 'string' ? err.code : '';

  const noRetryStatuses = new Set([400, 401, 403, 409]);
  const noRetryCodes = new Set([
    'AGENT_RUNTIME_UNAUTHORIZED',
    'AGENT_RUNTIME_FORBIDDEN',
    'AGENT_RUNTIME_BAD_REQUEST',
    'AGENT_RUNTIME_DRIFT',
  ]);

  if (noRetryStatuses.has(status) || noRetryCodes.has(code)) return false;
  if (status === 429 || code === 'AGENT_RUNTIME_RATE_LIMITED') return failureCount < 1;

  return failureCount < 2;
}

/**
 * Calculates the retry delay for a TanStack Query retry, honouring
 * the Retry-After value embedded in the error response when available.
 */
export function agentRuntimeRetryDelay(failureCount: number, error: unknown): number {
  if (!error || typeof error !== 'object') return 1000 * 2 ** failureCount;

  const err = error as Record<string, unknown>;

  if (typeof err.retryAfterMs === 'number') return err.retryAfterMs;

  return 1000 * 2 ** failureCount;
}
