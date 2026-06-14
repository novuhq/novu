import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, McpConnectionRepository } from '@novu/dal';
import { buildClaudePlatformVaultUrl, McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';

import { areHexDigestsEqual } from '../../../../shared/helpers/timing-safe-equal';
import { CompleteManagedAgentSetup } from '../../../managed-runtime/setup/complete-managed-agent-setup.usecase';
import { ManagedAgentSetupCompleteCommand } from '../../../managed-runtime/setup/managed-agent-setup-complete.command';
import type { McpOAuthState } from '../../oauth/generate-mcp-oauth-url/mcp-oauth-state';
import {
  decodeProviderManagedRedirectState,
  PROVIDER_MANAGED_REDIRECT_TTL_MS,
  type ProviderManagedRedirectState,
} from './provider-managed-redirect-state';

export interface CompleteProviderManagedRedirectResult {
  /** Final URL to 302 the user to — the provider's vault UI where OAuth completes. */
  redirectUrl: string;
}

/**
 * Handle the click on an in-channel "Connect from provider" link.
 *
 * Provider-managed MCPs have no Novu OAuth callback because Claude owns the
 * credential entirely. We treat the user opening this signed Novu link as
 * the user-intent signal — equivalent to clicking "Add from Claude" in the
 * dashboard — and promote the row to `connected` after forwarding the user
 * to Claude's vault UI. The signed `state` parameter is the trust boundary;
 * we verify it against the originating environment's API key so
 * unauthenticated traffic to this endpoint cannot flip arbitrary rows.
 *
 * The 302 is sent as soon as validation passes; persisting `connected` and
 * driving setup-card refresh / replay run fire-and-forget so the browser
 * does not wait on Slack API calls or agent replay.
 */
@Injectable()
export class CompleteProviderManagedRedirect {
  constructor(
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly completeManagedAgentSetup: CompleteManagedAgentSetup,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(CompleteProviderManagedRedirect.name);
  }

  async execute(state: string): Promise<CompleteProviderManagedRedirectResult> {
    const { payload, rawPayload, signature } = decodeProviderManagedRedirectState(state);

    const environment = await this.environmentRepository.findOne(
      { _id: payload.environmentId, _organizationId: payload.organizationId },
      ['apiKeys']
    );

    if (!environment?.apiKeys?.length) {
      throw new NotFoundException('Environment for redirect state not found or has no API keys.');
    }

    const isValidSignature = environment.apiKeys.some(
      ({ key }) => areHexDigestsEqual(createHash(key, rawPayload), signature)
    );
    if (!isValidSignature) {
      throw new BadRequestException('Provider-managed redirect signature mismatch.');
    }

    if (Date.now() - payload.timestamp > PROVIDER_MANAGED_REDIRECT_TTL_MS) {
      throw new BadRequestException('Provider-managed redirect state expired. Restart the setup flow.');
    }

    const connection = await this.mcpConnectionRepository.findOne(
      {
        _id: payload.connectionId,
        _environmentId: payload.environmentId,
        _organizationId: payload.organizationId,
      },
      ['_id']
    );

    if (!connection) {
      throw new NotFoundException('Provider-managed connection row not found.');
    }

    const redirectUrl = buildClaudePlatformVaultUrl(payload.externalVaultId, payload.externalWorkspaceId);

    void this.runPostRedirectSideEffects(payload, connection._id).catch((err) =>
      this.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          connectionId: payload.connectionId,
          conversationId: payload.conversationId,
        },
        'Provider-managed redirect post-work failed (non-fatal)'
      )
    );

    return { redirectUrl };
  }

  /**
   * Promote the connection and refresh setup cards / replay parked turns.
   * Runs after the 302 is issued — must not block the redirect response.
   */
  private async runPostRedirectSideEffects(payload: ProviderManagedRedirectState, connectionId: string): Promise<void> {
    await this.mcpConnectionRepository.update(
      {
        _id: connectionId,
        _environmentId: payload.environmentId,
        _organizationId: payload.organizationId,
      },
      {
        $set: {
          status: McpConnectionStatusEnum.Connected,
          connectedAt: new Date(),
        },
        $unset: { oauthState: 1, lastError: 1 },
      }
    );

    const stateData: McpOAuthState = {
      agentId: payload.agentId,
      agentMcpServerId: payload.agentMcpServerId,
      subscriberId: payload.subscriberId,
      environmentId: payload.environmentId,
      organizationId: payload.organizationId,
      mcpId: payload.mcpId,
      scope: McpConnectionScopeEnum.Subscriber,
      timestamp: payload.timestamp,
      source: 'setup_card',
      ...(payload.conversationId ? { conversationId: payload.conversationId } : {}),
    };

    await this.completeManagedAgentSetup.execute(ManagedAgentSetupCompleteCommand.create({ stateData }));
  }
}
