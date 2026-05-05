import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  type SubscriberAgentVaultConnection,
  type SubscriberAgentVaultEntity,
  SubscriberAgentVaultRepository,
} from '@novu/dal';

interface OauthRefreshParams {
  clientId: string;
  refreshToken: string;
  tokenEndpoint: string;
  tokenEndpointAuth:
    | { type: 'client_secret_basic'; clientSecret: string }
    | { type: 'client_secret_post'; clientSecret: string }
    | { type: 'none' };
  scope?: string;
  resource?: string;
}

/**
 * Owns the per-(subscriber, agent) Anthropic vault. Handles lazy provisioning so
 * the first inbound message of a conversation creates exactly one Anthropic vault,
 * and stores OAuth credentials inside it as users connect MCP servers.
 */
@Injectable()
export class SubscriberAnthropicVaultService {
  constructor(
    private readonly subscriberVaultRepository: SubscriberAgentVaultRepository,
    private readonly logger: PinoLogger
  ) {}

  async ensureVault(params: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentId: string;
    apiKey: string;
  }): Promise<SubscriberAgentVaultEntity> {
    const existing = await this.subscriberVaultRepository.findForSubscriberAgent(params);
    if (existing) {
      return existing;
    }

    const client = this.buildClient(params.apiKey);
    const created = await client.beta.vaults.create({
      display_name: this.buildVaultName(params),
    });

    const { doc, wasCreated } = await this.subscriberVaultRepository.upsertVault({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      subscriberId: params.subscriberId,
      agentId: params.agentId,
      anthropicVaultId: created.id,
    });

    if (!wasCreated) {
      // Lost the race — another writer beat us. Archive our duplicate Anthropic vault
      // so we don't leak resources. Best-effort.
      await client.beta.vaults.archive(created.id).catch((err) => {
        this.logger.warn(
          err,
          `Failed to archive duplicate Anthropic vault ${created.id} for subscriber ${params.subscriberId}/agent ${params.agentId}`
        );
      });
    }

    return doc;
  }

  async setOAuthCredential(params: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentId: string;
    apiKey: string;
    mcpServerName: string;
    mcpServerUrl: string;
    accessToken: string;
    expiresAt?: Date;
    refresh?: OauthRefreshParams;
  }): Promise<void> {
    const vault = await this.ensureVault({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      subscriberId: params.subscriberId,
      agentId: params.agentId,
      apiKey: params.apiKey,
    });

    const client = this.buildClient(params.apiKey);

    await this.archivePreviousCredential({
      apiKey: params.apiKey,
      vaultId: vault.anthropicVaultId,
      mcpServerUrl: params.mcpServerUrl,
    });

    const credential = await client.beta.vaults.credentials.create(vault.anthropicVaultId, {
      auth: {
        type: 'mcp_oauth',
        access_token: params.accessToken,
        mcp_server_url: params.mcpServerUrl,
        expires_at: params.expiresAt?.toISOString(),
        refresh: params.refresh
          ? {
              client_id: params.refresh.clientId,
              refresh_token: params.refresh.refreshToken,
              token_endpoint: params.refresh.tokenEndpoint,
              scope: params.refresh.scope,
              resource: params.refresh.resource,
              token_endpoint_auth: this.toAnthropicTokenEndpointAuth(params.refresh.tokenEndpointAuth),
            }
          : undefined,
      },
    });

    const connection: SubscriberAgentVaultConnection = {
      mcpServerName: params.mcpServerName,
      credentialId: credential.id,
      status: 'connected',
      connectedAt: new Date().toISOString(),
    };

    await this.subscriberVaultRepository.upsertConnection({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      vaultId: vault._id,
      connection,
    });
  }

  async removeConnection(params: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentId: string;
    apiKey: string;
    mcpServerName: string;
  }): Promise<void> {
    const vault = await this.subscriberVaultRepository.findForSubscriberAgent(params);
    if (!vault) {
      return;
    }

    const connection = vault.connections.find((c) => c.mcpServerName === params.mcpServerName);
    if (!connection) {
      return;
    }

    const client = this.buildClient(params.apiKey);
    await client.beta.vaults.credentials
      .archive(connection.credentialId, { vault_id: vault.anthropicVaultId })
      .catch((err) => {
        this.logger.warn(err, `Failed to archive Anthropic credential ${connection.credentialId}`);
      });

    await this.subscriberVaultRepository.removeConnection({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      vaultId: vault._id,
      mcpServerName: params.mcpServerName,
    });
  }

  async markConnectionStatus(params: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentId: string;
    mcpServerName: string;
    status: SubscriberAgentVaultConnection['status'];
  }): Promise<void> {
    const vault = await this.subscriberVaultRepository.findForSubscriberAgent(params);
    if (!vault) {
      return;
    }

    await this.subscriberVaultRepository.markConnectionStatus({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      vaultId: vault._id,
      mcpServerName: params.mcpServerName,
      status: params.status,
    });
  }

  /**
   * Best-effort: archive the Anthropic vault and its credentials for one subscriber on
   * a given agent. Used when an agent or subscriber is deleted.
   */
  async archiveVault(params: {
    organizationId: string;
    environmentId: string;
    apiKey: string;
    vault: SubscriberAgentVaultEntity;
  }): Promise<void> {
    const client = this.buildClient(params.apiKey);

    await Promise.all(
      params.vault.connections.map((connection) =>
        client.beta.vaults.credentials
          .archive(connection.credentialId, { vault_id: params.vault.anthropicVaultId })
          .catch((err) => this.logger.warn(err, `Failed to archive credential ${connection.credentialId}`))
      )
    );

    await client.beta.vaults.archive(params.vault.anthropicVaultId).catch((err) => {
      this.logger.warn(err, `Failed to archive Anthropic vault ${params.vault.anthropicVaultId}`);
    });

    await this.subscriberVaultRepository.deleteOne({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      vaultId: params.vault._id,
    });
  }

  private async archivePreviousCredential(params: {
    apiKey: string;
    vaultId: string;
    mcpServerUrl: string;
  }): Promise<void> {
    try {
      const client = this.buildClient(params.apiKey);
      for await (const credential of client.beta.vaults.credentials.list(params.vaultId)) {
        if (credential.archived_at) continue;
        const url = (credential.auth as { mcp_server_url?: string }).mcp_server_url;
        if (url === params.mcpServerUrl) {
          await client.beta.vaults.credentials.archive(credential.id, { vault_id: params.vaultId }).catch((err) => {
            this.logger.warn(err, `Failed to archive Anthropic credential ${credential.id}`);
          });
        }
      }
    } catch (err) {
      this.logger.warn(err, `Failed to enumerate Anthropic credentials in vault ${params.vaultId}`);
    }
  }

  private buildClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  private buildVaultName(params: { subscriberId: string; agentId: string }): string {
    return `novu-sub-${params.subscriberId.slice(-6)}-${params.agentId.slice(-6)}`;
  }

  private toAnthropicTokenEndpointAuth(auth: OauthRefreshParams['tokenEndpointAuth']) {
    if (auth.type === 'client_secret_basic') {
      return { type: 'client_secret_basic' as const, client_secret: auth.clientSecret };
    }
    if (auth.type === 'client_secret_post') {
      return { type: 'client_secret_post' as const, client_secret: auth.clientSecret };
    }

    return { type: 'none' as const };
  }
}
