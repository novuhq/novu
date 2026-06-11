import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase, resolveAgentRuntime } from '@novu/application-generic';

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
    const resolved = resolveAgentRuntime(command.providerId, {
      apiKey: command.apiKey,
      region: command.region,
      externalWorkspaceId: command.externalWorkspaceId,
    });

    if (!resolved) {
      throw new BadRequestException('Incomplete credentials for the selected provider');
    }

    await resolved.provider.validateCredentials(resolved.validateCredentialsInput);

    return { valid: true };
  }
}
