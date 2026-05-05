import { BadRequestException, Injectable } from '@nestjs/common';
import { MCP_CATALOG } from '../../runtimes/mcp-catalog';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { OrgAnthropicVaultService } from '../../services/org-anthropic-vault.service';
import { RemoveSharedMcpCredentialCommand } from './remove-shared-mcp-credential.command';

@Injectable()
export class RemoveSharedMcpCredential {
  constructor(
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly orgVaultService: OrgAnthropicVaultService
  ) {}

  async execute(command: RemoveSharedMcpCredentialCommand): Promise<void> {
    const entry = MCP_CATALOG[command.mcpServerName];
    if (!entry) {
      throw new BadRequestException(`Unknown MCP catalog id "${command.mcpServerName}".`);
    }

    const vaultId = await this.orgVaultService.tryGet(command.organizationId, command.environmentId);
    if (!vaultId) {
      // Nothing to remove — never had an org vault.
      return;
    }

    const apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId);

    await this.orgVaultService.archiveCredentialsForMcpServer({
      apiKey,
      vaultId,
      mcpServerUrl: entry.url,
    });
  }
}
