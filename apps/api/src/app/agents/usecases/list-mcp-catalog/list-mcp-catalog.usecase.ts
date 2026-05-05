import { Injectable } from '@nestjs/common';
import type { ListMcpCatalogResponseDto } from '../../dtos/agent-runtime.dto';
import { MCP_CATALOG, type McpCatalogId } from '../../runtimes/mcp-catalog';

/**
 * Returns the curated MCP catalog so the dashboard can render the External tools picker.
 */
@Injectable()
export class ListMcpCatalog {
  execute(): ListMcpCatalogResponseDto {
    const data = (Object.keys(MCP_CATALOG) as McpCatalogId[]).map((id) => {
      const entry = MCP_CATALOG[id];

      return {
        name: id,
        displayName: entry.displayName,
        url: entry.url,
        authType: entry.authType,
        scope: entry.scope,
        oauthProvider: entry.oauth?.provider,
        description: entry.description,
      };
    });

    return { data };
  }
}
