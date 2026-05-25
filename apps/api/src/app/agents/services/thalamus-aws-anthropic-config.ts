import { thalamus } from '@novu/thalamus';
import { toThalamusAwsAnthropicCredentials, type ResolvedAwsAnthropicCredentials } from '@novu/application-generic';

type ThalamusAnthropicConfig = Parameters<typeof thalamus.anthropic>[0];

export function buildThalamusAwsAnthropicConfig(
  awsCredentials: ResolvedAwsAnthropicCredentials,
  agentId: string,
  environmentId: string,
  durable: ThalamusAnthropicConfig['durable']
): ThalamusAnthropicConfig {
  const awsConfig = toThalamusAwsAnthropicCredentials(awsCredentials);

  return {
    agentId,
    environmentId,
    durable,
    ...awsConfig,
  };
}
