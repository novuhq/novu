import Anthropic from '@anthropic-ai/sdk';

/** Timeout for Anthropic API calls in ms */
export const ANTHROPIC_REQUEST_TIMEOUT_MS = 10_000;

export type AnthropicCompatibleClient = Anthropic;

export function createAnthropicCloudClient(apiKey: string): AnthropicCompatibleClient {
  return new Anthropic({ apiKey, timeout: ANTHROPIC_REQUEST_TIMEOUT_MS, maxRetries: 0 });
}
