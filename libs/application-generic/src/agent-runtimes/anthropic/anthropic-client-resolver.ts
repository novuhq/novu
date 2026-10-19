import { AgentRuntimeProviderIdEnum } from '@novu/shared';

import { AgentRuntimeBadRequestError } from '../errors';
import type { ValidateCredentialsInput } from '../i-agent-runtime-provider';
import { createAnthropicAwsClient } from './anthropic-aws-client';
import {
  resolveAwsAnthropicCredentials,
  type ResolvedAwsAnthropicCredentials,
} from './anthropic-aws-credentials';
import { createAnthropicCloudClient, type AnthropicCompatibleClient } from './anthropic-cloud-client';

export class AnthropicClientResolver {
  private awsClientPromise?: Promise<AnthropicCompatibleClient>;

  constructor(
    private readonly providerId: AgentRuntimeProviderIdEnum,
    private readonly apiKey?: string,
    private readonly awsCredentials?: ResolvedAwsAnthropicCredentials
  ) {}

  async getClient(input?: ValidateCredentialsInput): Promise<AnthropicCompatibleClient> {
    if (this.awsCredentials) {
      if (input) {
        const override = resolveAwsAnthropicCredentials({
          region: input.region ?? this.awsCredentials.region,
          externalWorkspaceId: input.externalWorkspaceId ?? this.awsCredentials.workspaceId,
          apiKey: input.apiKey ?? this.awsCredentials.apiKey,
        });

        if (!override) {
          throw new AgentRuntimeBadRequestError(
            'Invalid AWS Claude credentials',
            AgentRuntimeProviderIdEnum.AnthropicAws
          );
        }

        return createAnthropicAwsClient(override);
      }

      if (!this.awsClientPromise) {
        this.awsClientPromise = createAnthropicAwsClient(this.awsCredentials);
      }

      return this.awsClientPromise;
    }

    const apiKey = input?.apiKey ?? this.apiKey;

    if (!apiKey) {
      throw new AgentRuntimeBadRequestError('API key is required', this.providerId);
    }

    return createAnthropicCloudClient(apiKey);
  }
}
