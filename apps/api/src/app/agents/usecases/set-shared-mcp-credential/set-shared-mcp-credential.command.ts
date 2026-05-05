import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MCP_CATALOG_IDS, type McpCatalogId } from '../../runtimes/mcp-catalog';

export class SetSharedMcpCredentialCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsIn(MCP_CATALOG_IDS as unknown as string[])
  mcpServerName: McpCatalogId;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  token: string;
}
