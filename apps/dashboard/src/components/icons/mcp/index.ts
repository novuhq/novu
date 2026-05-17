import type { ComponentType, SVGProps } from 'react';
import { AirtableIcon } from './airtable';
import { ClickupIcon } from './clickup';
import { FigmaIcon } from './figma';
import { GithubIcon } from './github';
import { LinearIcon } from './linear';
import { MondayIcon } from './monday';
import { NotionIcon } from './notion';

export { AirtableIcon, ClickupIcon, FigmaIcon, GithubIcon, LinearIcon, MondayIcon, NotionIcon };

export type McpIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Maps a Claude MCP server id (matching `CLAUDE_MCP_SERVERS[].id`) to a brand icon component.
 * Servers without an entry render no icon.
 */
export const MCP_ICONS: Record<string, McpIconComponent> = {
  airtable: AirtableIcon,
  clickup: ClickupIcon,
  figma: FigmaIcon,
  github: GithubIcon,
  linear: LinearIcon,
  monday: MondayIcon,
  notion: NotionIcon,
};

export function getMcpIcon(id: string | undefined | null): McpIconComponent | undefined {
  if (!id) return undefined;

  return MCP_ICONS[id];
}
