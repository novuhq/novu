import { Injectable } from '@nestjs/common';
import { getAgentRuntimeProvider, InstrumentUsecase } from '@novu/application-generic';

import { VerifyManagedCredentialsCommand } from './verify-managed-credentials.command';

export type VerifyManagedCredentialsResult = {
  valid: true;
};

/**
 * Stateless API-key verification for managed-runtime providers. Delegates to the runtime provider's
 * `validateCredentials()` which performs a cheap read-only call against the upstream API. Errors are
 * propagated as `AgentRuntimeError` subclasses and translated to HTTP status codes by
 * `AgentRuntimeExceptionFilter`.
 */
@Injectable()
export class VerifyManagedCredentials {
  @InstrumentUsecase()
  async execute(command: VerifyManagedCredentialsCommand): Promise<VerifyManagedCredentialsResult> {
    const provider = getAgentRuntimeProvider(command.providerId, command.apiKey);
    await provider.validateCredentials(command.apiKey);

    return { valid: true };
  }
}
