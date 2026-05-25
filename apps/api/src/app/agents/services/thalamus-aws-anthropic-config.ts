import { thalamus } from '@novu/thalamus';
import {
  resolveAwsAnthropicCredentials,
  toThalamusAwsAnthropicCredentials,
} from '@novu/application-generic';

type ThalamusAnthropicConfig = Parameters<typeof thalamus.anthropic>[0];

/**
 * Builds a Thalamus Anthropic provider config for AWS Claude Platform.
 * Uses a widened cast until @novu/thalamus alpha.9 ships with per-tenant AWS credentials.
 */
export function buildThalamusAwsAnthropicConfig(
  credentials: Record<string, unknown>,
  agentId: string,
  environmentId: string,
  durable: ThalamusAnthropicConfig['durable']
): ThalamusAnthropicConfig {
  const resolved = resolveAwsAnthropicCredentials(credentials);

  if (!resolved) {
    throw new Error('Integration is missing required AWS Claude credentials');
  }

  const awsConfig = toThalamusAwsAnthropicCredentials(resolved);

  return {
    agentId,
    environmentId,
    durable,
    ...awsConfig,
  } as ThalamusAnthropicConfig;
}
