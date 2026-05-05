import Anthropic from '@anthropic-ai/sdk';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { ListSharedMcpCredentialsResponseDto } from '../../dtos/agent-runtime.dto';
import { MCP_CATALOG, type McpCatalogId } from '../../runtimes/mcp-catalog';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { OrgAnthropicVaultService } from '../../services/org-anthropic-vault.service';
import { ListSharedMcpCredentialsCommand } from './list-shared-mcp-credentials.command';

/**
 * Returns whether each shared-scope MCP catalog entry has a credential configured in
 * the org-level Anthropic vault. The dashboard uses this to render "Configured" /
 * "Not set" pills next to each shared MCP.
 */
@Injectable()
export class ListSharedMcpCredentials {
  constructor(
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly orgVaultService: OrgAnthropicVaultService,
    private readonly logger: PinoLogger
  ) {}

  async execute(command: ListSharedMcpCredentialsCommand): Promise<ListSharedMcpCredentialsResponseDto> {
    const sharedEntries = (Object.keys(MCP_CATALOG) as McpCatalogId[])
      .map((id) => ({ id, entry: MCP_CATALOG[id] }))
      .filter(({ entry }) => entry.scope === 'shared');

    const baseData = sharedEntries.map(({ id, entry }) => ({
      mcpServerName: id,
      displayName: entry.displayName,
      configured: false,
    }));

    const vaultId = await this.orgVaultService.tryGet(command.organizationId, command.environmentId);
    if (!vaultId) {
      return { data: baseData };
    }

    let apiKey: string;
    try {
      apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        return { data: baseData };
      }
      throw err;
    }

    const client = new Anthropic({ apiKey });
    const configuredUrls = new Set<string>();

    try {
      for await (const credential of client.beta.vaults.credentials.list(vaultId)) {
        if (credential.archived_at) continue;
        const url = (credential.auth as { mcp_server_url?: string }).mcp_server_url;
        if (url) {
          configuredUrls.add(url);
        }
      }
    } catch (err) {
      this.logger.warn(err, `Failed to list credentials in Anthropic vault ${vaultId}`);

      return { data: baseData };
    }

    return {
      data: baseData.map((row) => ({
        ...row,
        configured: configuredUrls.has(MCP_CATALOG[row.mcpServerName as McpCatalogId].url),
      })),
    };
  }
}
