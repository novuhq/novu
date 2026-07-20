import { Injectable } from '@nestjs/common';
import {
  createContextHash,
  createHash,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
} from '@novu/application-generic';
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
 * caller's own identity, all signed with the Novu-hosted app environment secret key.
 *
 * The dashboard connects to the *Novu-hosted* app (`APP_ID`), whose environment is
 * `NOVU_HOSTED_AGENT_ENVIRONMENT_ID` (the same env the copilot bridge resolves its secret from).
 * This runs in the **customer's authenticated session** and builds the tenant binding server-side
 * from that session (never from client input), but signs it with the **hosted app environment's**
 * secret key — the single trust anchor the hosting env verifies against (dogfooded Inbox HMAC and
 * the NovuCopilot Slack connect flow). Because the org/env/user are taken from the authenticated
 * session and the signature can only be produced by Novu's own backend, a browser can neither forge
 * the binding nor claim a foreign tenant.
 */
@Injectable()
export class BuildNovuContext {
  constructor(private readonly getDecryptedSecretKey: GetDecryptedSecretKey) {}

  async execute(command: BuildNovuContextCommand): Promise<NovuConnectContext> {
    // Only mint a subscriber HMAC for the caller's own identity — never an arbitrary one,
    // which would let an authenticated user impersonate another subscriber of the hosted app.
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

    const hostedAgentEnvironmentId = process.env.NOVU_HOSTED_AGENT_ENVIRONMENT_ID;

    if (!hostedAgentEnvironmentId?.trim()) {
      throw new Error('NOVU_HOSTED_AGENT_ENVIRONMENT_ID must be configured to mint a Novu connect context.');
    }

    // Sign with the Novu-hosted app environment's key — the connection lives under that env's
    // integration, so its secret is the key the connect/Inbox flow verifies against. The dashboard
    // authenticates as a subscriber of this same hosted app (APP_ID), so the subscriber HMAC is
    // minted with the same secret.
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: hostedAgentEnvironmentId,
      })
    );

    const contextHash = createContextHash(secretKey, context);
    const subscriberHash = createHash(secretKey, expectedSubscriberId);

    if (!contextHash || !subscriberHash) {
      throw new Error('Failed to compute the Novu connect context hash.');
    }

    return { context, contextHash, subscriberHash };
  }
}
