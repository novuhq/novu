import { Injectable } from '@nestjs/common';
import {
  createContextHash,
  createHash,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
} from '@novu/application-generic';
import type { ContextPayload } from '@novu/shared';
import { BuildCopilotConnectContextCommand } from './build-copilot-connect-context.command';

/** Context key the NovuCopilot connection is bound to (read back inbound as `ctx.context.tenant`). */
const COPILOT_TENANT_CONTEXT_KEY = 'tenant';

/**
 * The subscriber identity the dashboard `CopilotConnectProvider` authenticates as against the
 * hosted Novu app (`org_<organizationId>:user_<userId>`). Used only to assert the client-supplied
 * `subscriberId` belongs to the authenticated session before we sign a `subscriberHash` for it.
 */
export function buildCopilotSubscriberId(organizationId: string, userId: string): string {
  return `org_${organizationId}:user_${userId}`;
}

export interface CopilotConnectContext {
  context: ContextPayload;
  contextHash: string;
  subscriberHash: string;
}

/**
 * Mints the customer tenant `context` + a trusted `contextHash` for the NovuCopilot
 * Slack connect flow.
 *
 * The dashboard connects to the *Novu-hosted* copilot agent, whose Slack integration is
 * owned by the Novu-prod environment `NOVU_HOSTED_AGENT_ENVIRONMENT_ID` (the same env the
 * bridge resolves its secret from). This runs in the **customer's authenticated session**
 * and builds the tenant binding server-side from that session (never from client input),
 * but signs it with the **hosted agent environment's** secret key — the single trust anchor
 * the hosting env verifies against at connect time. Because the org/env/user are taken from
 * the authenticated session and the signature can only be produced by Novu's own backend,
 * a browser can neither forge the binding nor claim a foreign tenant.
 */
@Injectable()
export class BuildCopilotConnectContext {
  constructor(private readonly getDecryptedSecretKey: GetDecryptedSecretKey) {}

  async execute(command: BuildCopilotConnectContextCommand): Promise<CopilotConnectContext> {
    // Only mint a subscriber HMAC for the caller's own identity — never an arbitrary one,
    // which would let an authenticated user impersonate another subscriber of the hosted app.
    const expectedSubscriberId = buildCopilotSubscriberId(command.organizationId, command.userId);

    const context: ContextPayload = {
      // Shared org/env binding — same key (`tenant:<organizationId>`) for every user in the org.
      [COPILOT_TENANT_CONTEXT_KEY]: {
        id: command.organizationId,
        data: {
          environmentId: command.environmentId,
        },
      },
    };

    const hostedAgentEnvironmentId = process.env.NOVU_HOSTED_AGENT_ENVIRONMENT_ID;

    if (!hostedAgentEnvironmentId?.trim()) {
      throw new Error('NOVU_HOSTED_AGENT_ENVIRONMENT_ID must be configured to mint a NovuCopilot connect context.');
    }

    // Sign with the Novu-hosted agent environment's key — the connection lives under that
    // env's copilot integration, so its secret is the key the connect flow verifies against.
    // The dashboard authenticates as a subscriber of this same hosted app (APP_ID), so the
    // subscriber HMAC is minted with the same secret.
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: hostedAgentEnvironmentId,
      })
    );

    const contextHash = createContextHash(secretKey, context);
    const subscriberHash = createHash(secretKey, expectedSubscriberId);

    if (!contextHash || !subscriberHash) {
      throw new Error('Failed to compute the copilot connect context hash.');
    }

    return { context, contextHash, subscriberHash };
  }
}
