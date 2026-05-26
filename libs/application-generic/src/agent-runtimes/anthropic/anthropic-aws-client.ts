import type Anthropic from '@anthropic-ai/sdk';

import { ANTHROPIC_REQUEST_TIMEOUT_MS } from './anthropic-cloud-client';
import type { ResolvedAwsAnthropicCredentials } from './anthropic-aws-credentials';
import type { AnthropicCompatibleClient } from './anthropic-cloud-client';

export async function createAnthropicAwsClient(
  credentials: ResolvedAwsAnthropicCredentials
): Promise<AnthropicCompatibleClient> {
  const { AnthropicAws } = await import('@anthropic-ai/aws-sdk');

  return new AnthropicAws({
    awsRegion: credentials.region,
    workspaceId: credentials.workspaceId,
    apiKey: credentials.apiKey,
    timeout: ANTHROPIC_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  }) as Anthropic;
}
