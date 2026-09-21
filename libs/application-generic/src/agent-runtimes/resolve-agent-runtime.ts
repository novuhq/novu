import { AgentRuntimeProviderIdEnum, type ICredentialsDto, isAnthropicAwsProvider } from '@novu/shared';

import { decryptCredentials } from '../encryption/encrypt-provider';
import { areNovuManagedClaudeCredentialsSet, getNovuManagedClaudeApiKey } from '../utils/novu-integrations';
import { createAnthropicProvider } from './anthropic/anthropic-agent-runtime.provider';
import {
  type ResolvedAwsAnthropicCredentials,
  resolveAwsAnthropicCredentials,
  toValidateCredentialsInput,
} from './anthropic/anthropic-aws-credentials';
import { createGeminiProvider } from './google/gemini-agent-runtime.provider';
import { type ResolvedGeminiCredentials, resolveGeminiCredentials } from './google/google-credentials';
import type { IAgentRuntimeProvider, ValidateCredentialsInput } from './i-agent-runtime-provider';

export type ResolvedAgentRuntime = {
  apiKey: string;
  credentials: ReturnType<typeof decryptCredentials>;
  provider: IAgentRuntimeProvider;
  validateCredentialsInput: ValidateCredentialsInput;
  awsCredentials?: ResolvedAwsAnthropicCredentials;
  googleCredentials?: ResolvedGeminiCredentials;
};

export function resolveAgentRuntime(
  providerId: AgentRuntimeProviderIdEnum | string,
  credentials: ICredentialsDto | undefined
): ResolvedAgentRuntime | null {
  if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
    if (!areNovuManagedClaudeCredentialsSet()) {
      return null;
    }

    const apiKey = getNovuManagedClaudeApiKey();
    const decrypted = decryptCredentials(credentials ?? {});

    return {
      apiKey,
      credentials: decrypted,
      provider: createAnthropicProvider(AgentRuntimeProviderIdEnum.NovuAnthropic, { apiKey }),
      validateCredentialsInput: { apiKey },
    };
  }

  const decrypted = decryptCredentials(credentials ?? {});

  if (isAnthropicAwsProvider(providerId)) {
    const awsCredentials = resolveAwsAnthropicCredentials(decrypted as Record<string, unknown>);

    if (!awsCredentials) {
      return null;
    }

    const validateCredentialsInput = toValidateCredentialsInput(decrypted as Record<string, unknown>);

    return {
      apiKey: awsCredentials.apiKey,
      credentials: decrypted,
      awsCredentials,
      provider: createAnthropicProvider(AgentRuntimeProviderIdEnum.AnthropicAws, { awsCredentials }),
      validateCredentialsInput,
    };
  }

  if (providerId === AgentRuntimeProviderIdEnum.Google) {
    const googleCredentials = resolveGeminiCredentials(decrypted as Record<string, unknown>);

    if (!googleCredentials) {
      return null;
    }

    return {
      apiKey: '',
      credentials: decrypted,
      googleCredentials,
      provider: createGeminiProvider(decrypted as Record<string, unknown>),
      validateCredentialsInput: {},
    };
  }

  const apiKey = decrypted.apiKey as string | undefined;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    credentials: decrypted,
    provider: createAnthropicProvider(providerId as AgentRuntimeProviderIdEnum, { apiKey }),
    validateCredentialsInput: { apiKey },
  };
}
