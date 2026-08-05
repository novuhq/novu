import { Injectable } from '@nestjs/common';
import { createContextHash, createHash } from '@novu/application-generic';
import type { ContextPayload } from '@novu/shared';
import { BuildNovuContextCommand } from './build-novu-context.command';

/** Context key the dashboard connection is bound to (read back inbound as `ctx.context.tenant`). */
const NOVU_TENANT_CONTEXT_KEY = 'tenant';

export interface NovuConnectContext {
  context: ContextPayload;
  contextHash: string;
  subscriberHash: string;
}

/**
 * Mints the customer tenant `context` + a trusted `contextHash`, plus a `subscriberHash` for the
 * caller's own identity, all signed with the Novu secret API key.
 */
@Injectable()
export class BuildNovuContext {
  async execute(command: BuildNovuContextCommand): Promise<NovuConnectContext> {
    const expectedSubscriberId = command.userId;

    const context: ContextPayload = {
      // Shared org/env binding — same key (`tenant:<organizationId>`) for every user in the org.
      [NOVU_TENANT_CONTEXT_KEY]: {
        id: command.organizationId,
        data: {
          environmentId: command.environmentId,
        },
      },
    };

    const novuSecretApiKey = process.env.NOVU_SECRET_API_KEY;
    if (!novuSecretApiKey?.trim()) {
      throw new Error('NOVU_SECRET_API_KEY must be configured to mint a Novu connect context.');
    }

    const contextHash = createContextHash(novuSecretApiKey, context);
    const subscriberHash = createHash(novuSecretApiKey, expectedSubscriberId);

    if (!contextHash || !subscriberHash) {
      throw new Error('Failed to compute the Novu connect context hash.');
    }

    return { context, contextHash, subscriberHash };
  }
}
