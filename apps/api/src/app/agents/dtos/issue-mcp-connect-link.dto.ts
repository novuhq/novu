import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { MCP_CATALOG_IDS, type McpCatalogId } from '../runtimes/mcp-catalog';

export class IssueMcpConnectLinkRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @ApiProperty({ enum: MCP_CATALOG_IDS })
  @IsString()
  @IsIn(MCP_CATALOG_IDS as unknown as string[])
  mcpServerName: McpCatalogId;
}

export class IssueMcpConnectLinkResponseDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  expiresAt: string;
}
