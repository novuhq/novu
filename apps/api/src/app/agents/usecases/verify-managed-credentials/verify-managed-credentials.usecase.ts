import { Injectable } from '@nestjs/common';
import {
  createAnthropicProvider,
  getAgentRuntimeProvider,
  InstrumentUsecase,
  toValidateCredentialsInput,
} from '@novu/application-generic';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';

import { VerifyManagedCredentialsCommand } from './verify-managed-credentials.command';

export type VerifyManagedCredentialsResult = {
  valid: true;
};

/**
 * Stateless credential verification for managed-runtime providers. Delegates to the runtime provider's
 * `validateCredentials()` which performs a cheap read-only call against the upstream API. Errors are
 * propagated as `AgentRuntimeError` subclasses and translated to HTTP status codes by
 * `AgentRuntimeExceptionFilter`.
 */
@Injectable()
export class VerifyManagedCredentials {
  @InstrumentUsecase()
  async execute(command: VerifyManagedCredentialsCommand): Promise<VerifyManagedCredentialsResult> {
    if (command.providerId === AgentRuntimeProviderIdEnum.AnthropicAws) {
      const credentials = {
        region: command.region,
        externalWorkspaceId: command.externalWorkspaceId,
        apiKey: command.apiKey,
      };
      const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.AnthropicAws, { credentials });
      await provider.validateCredentials(toValidateCredentialsInput(credentials));

      return { valid: true };
    }

    const provider = getAgentRuntimeProvider(command.providerId, command.apiKey!);
    await provider.validateCredentials({
      apiKey: command.apiKey,
      externalWorkspaceId: command.externalWorkspaceId,
    });

    return { valid: true };
  }
}
