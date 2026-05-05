import { BadRequestException, Injectable } from '@nestjs/common';
import { MCP_CATALOG } from '../../runtimes/mcp-catalog';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { OrgAnthropicVaultService } from '../../services/org-anthropic-vault.service';
import { SetSharedMcpCredentialCommand } from './set-shared-mcp-credential.command';

export interface SetSharedMcpCredentialResponse {
  configured: boolean;
}

/**
 * Stores a static-bearer credential for a shared-scope MCP server in the org-level
 * Anthropic vault. Phase 2 only supports `scope: 'shared'` MCPs (e.g. internal Confluence).
 */
@Injectable()
export class SetSharedMcpCredential {
  constructor(
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly orgVaultService: OrgAnthropicVaultService
  ) {}

  async execute(command: SetSharedMcpCredentialCommand): Promise<SetSharedMcpCredentialResponse> {
    const entry = MCP_CATALOG[command.mcpServerName];
    if (!entry) {
      throw new BadRequestException(`Unknown MCP catalog id "${command.mcpServerName}".`);
    }

    if (entry.authType !== 'static_bearer' || entry.scope !== 'shared') {
      throw new BadRequestException(
        `MCP server "${command.mcpServerName}" does not accept shared static-bearer credentials.`
      );
    }

    const apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId);

    await this.orgVaultService.setStaticBearer({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      userId: command.userId,
      apiKey,
      mcpServerUrl: entry.url,
      token: command.token,
    });

    return { configured: true };
  }
}
