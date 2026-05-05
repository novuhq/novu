import { IsIn, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MCP_CATALOG_IDS, type McpCatalogId } from '../../runtimes/mcp-catalog';

export class RemoveSharedMcpCredentialCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsIn(MCP_CATALOG_IDS as unknown as string[])
  mcpServerName: McpCatalogId;
}
