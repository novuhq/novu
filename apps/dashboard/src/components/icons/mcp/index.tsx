import type { ComponentType, SVGProps } from 'react';
import { SiGoogleanalytics, SiHubspot, SiIntercom, SiSalesforce, SiSlack, SiStripe } from 'react-icons/si';
import { AirtableIcon } from './airtable';
import { ClickupIcon } from './clickup';
import { FigmaIcon } from './figma';
import { GithubIcon } from './github';
import { LinearIcon } from './linear';
import { MondayIcon } from './monday';
import { NotionIcon } from './notion';

export { AirtableIcon, ClickupIcon, FigmaIcon, GithubIcon, LinearIcon, MondayIcon, NotionIcon };

export type McpIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const slackIcon: McpIconComponent = (props) => <SiSlack color="#4A154B" {...props} />;
const hubspotIcon: McpIconComponent = (props) => <SiHubspot color="#FF7A59" {...props} />;
const stripeIcon: McpIconComponent = (props) => <SiStripe color="#635BFF" {...props} />;
const salesforceIcon: McpIconComponent = (props) => <SiSalesforce color="#00A1E0" {...props} />;
const intercomIcon: McpIconComponent = (props) => <SiIntercom color="#1F8DED" {...props} />;
const googleAnalyticsIcon: McpIconComponent = (props) => <SiGoogleanalytics color="#E37400" {...props} />;

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
  slack: slackIcon,
  hubspot: hubspotIcon,
  stripe: stripeIcon,
  salesforce: salesforceIcon,
  intercom: intercomIcon,
  'google-analytics': googleAnalyticsIcon,
};

export function getMcpIcon(id: string | undefined | null): McpIconComponent | undefined {
  if (!id) return undefined;

  return MCP_ICONS[id];
}
