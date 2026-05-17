import { createHash as nodeCreateHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, encodeOAuthState } from '@novu/application-generic';
import {
  AgentMcpServerEntity,
  AgentMcpServerRepository,
  AgentRepository,
  EnvironmentRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  CLAUDE_MCP_SERVERS,
  McpConnectionAuthModeEnum,
  McpConnectionScopeEnum,
  McpConnectionStatusEnum,
} from '@novu/shared';

import { GenerateMcpOAuthUrlResponseDto } from '../../dtos/mcp-server.dto';
import { getMcpOAuthCatalogEntry, type NovuOAuthCatalogEntry } from '../../utils/mcp-oauth-catalog';
import { GenerateMcpOAuthUrlCommand } from './generate-mcp-oauth-url.command';
import { buildMcpOAuthRedirectUri, type McpOAuthState } from './mcp-oauth-state';

/**
 * Build the provider authorize URL for an `agent_mcp_subscriber`-scoped MCP
 * OAuth flow. Reuses the signed-state pattern from chat integrations
 * (`encodeOAuthState` + `createHash`) so callbacks can be verified with the
 * environment API key.
 *
 * Side-effects: ensures a `pending_oauth` `mcp_connection` row exists so the
 * dashboard can show "authorisation in progress" without waiting for the
 * provider to redirect back. The same row is updated on callback.
 */
@Injectable()
export class GenerateMcpOAuthUrl {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GenerateMcpOAuthUrlCommand): Promise<GenerateMcpOAuthUrlResponseDto> {
    const catalog = CLAUDE_MCP_SERVERS.find((entry) => entry.id === command.mcpId);

    if (!catalog) {
      throw new BadRequestException(`Unknown MCP "${command.mcpId}".`);
    }

    const oauthConfig = getMcpOAuthCatalogEntry(command.mcpId);

    if (oauthConfig.mode !== 'novu') {
      throw new UnprocessableEntityException(
        `MCP "${command.mcpId}" does not support Novu-managed OAuth. Use the provider-vault flow.`
      );
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });

    if (!enablement || !enablement.enabled) {
      throw new UnprocessableEntityException(
        `MCP "${command.mcpId}" is not enabled on agent "${command.agentIdentifier}".`
      );
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${command.subscriberId}" not found in this environment.`);
    }

    const pkceVerifier = oauthConfig.pkceRequired ? generatePkceVerifier() : undefined;

    await this.upsertPendingConnection(enablement, subscriber._id, command, pkceVerifier);

    const state = await this.buildSignedState(enablement, subscriber._id, agent._id, command);

    return { authorizeUrl: this.buildAuthorizeUrl(oauthConfig, state, pkceVerifier) };
  }

  private async upsertPendingConnection(
    enablement: AgentMcpServerEntity,
    subscriberMongoId: string,
    command: GenerateMcpOAuthUrlCommand,
    pkceVerifier: string | undefined
  ): Promise<void> {
    const oauthState = {
      pkceVerifier,
      initiatedAt: new Date(),
    };

    const existing = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriberMongoId,
    });

    if (existing) {
      await this.mcpConnectionRepository.update(
        {
          _id: existing._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: {
            status: McpConnectionStatusEnum.PendingOAuth,
            oauthState,
          },
          $unset: { lastError: 1 },
        }
      );

      return;
    }

    await this.mcpConnectionRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      scope: McpConnectionScopeEnum.AgentMcpSubscriber,
      mcpId: command.mcpId,
      _agentMcpServerId: enablement._id,
      _subscriberId: subscriberMongoId,
      authMode: McpConnectionAuthModeEnum.Novu,
      status: McpConnectionStatusEnum.PendingOAuth,
      oauthState,
    });
  }

  private async buildSignedState(
    enablement: AgentMcpServerEntity,
    subscriberMongoId: string,
    agentId: string,
    command: GenerateMcpOAuthUrlCommand
  ): Promise<string> {
    const stateData: McpOAuthState = {
      agentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriberMongoId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      mcpId: command.mcpId,
      scope: McpConnectionScopeEnum.AgentMcpSubscriber,
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(stateData);
    const apiKey = await this.getEnvironmentApiKey(command.environmentId);
    const signature = createHash(apiKey, payload);

    if (!signature) {
      throw new BadRequestException('Failed to create OAuth state signature.');
    }

    return encodeOAuthState(payload, signature);
  }

  private buildAuthorizeUrl(config: NovuOAuthCatalogEntry, state: string, pkceVerifier: string | undefined): string {
    const clientId = process.env[config.clientIdEnvVar];

    if (!clientId) {
      // Misconfigured server-side env, not a client error. 500 is the right shape.
      throw new Error(`MCP OAuth client id env var ${config.clientIdEnvVar} is not configured.`);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: buildMcpOAuthRedirectUri(),
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    if (pkceVerifier) {
      params.set('code_challenge', deriveCodeChallenge(pkceVerifier));
      params.set('code_challenge_method', 'S256');
    }

    return `${config.authorizeUrl}?${params.toString()}`;
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment "${environmentId}" not found.`);
    }

    return apiKeys[0].key;
  }
}

/**
 * Generate a PKCE code_verifier (RFC 7636 §4.1) — 32 bytes of randomness
 * encoded as base64url, yielding 43 chars within the 43-128 length window.
 */
function generatePkceVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

/**
 * Derive the S256 code_challenge from a verifier (RFC 7636 §4.2).
 */
function deriveCodeChallenge(verifier: string): string {
  return base64UrlEncode(nodeCreateHash('sha256').update(verifier).digest());
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
