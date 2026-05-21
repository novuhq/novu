export type McpServerCategory =
  | 'productivity'
  | 'communication'
  | 'code'
  | 'data'
  | 'sales-and-marketing'
  | 'financial-services'
  | 'design'
  | 'health-and-wellness'
  | 'other';

export type McpServer = {
  /** Stable identifier used as a key in selections */
  id: string;
  name: string;
  description: string;
  /** Remote MCP server URL (used to configure the connection) */
  url: string;
  category: McpServerCategory;
  /** Whether this server appears in the "Popular" section of the picker */
  popular: boolean;
};

export const MCP_SERVERS: McpServer[] = [
  // ── Popular ────────────────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    description: 'Read and send Slack messages, manage channels and workspaces.',
    url: 'https://mcp.slack.com/mcp',
    category: 'communication',
    popular: true,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Access and manage Linear issues, projects, and cycles.',
    url: 'https://mcp.linear.app/mcp',
    category: 'productivity',
    popular: true,
  },
  {
    id: 'atlassian-rovo',
    name: 'Atlassian Rovo',
    description: 'Access Jira issues and Confluence pages in one integration.',
    url: 'https://mcp.atlassian.com/v1/mcp/authv2',
    category: 'productivity',
    popular: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Interact with repositories, pull requests, issues, and code.',
    url: 'https://api.githubcopilot.com/mcp/',
    category: 'code',
    popular: true,
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Access error events, issues, and performance data from Sentry.',
    url: 'https://mcp.sentry.dev/mcp',
    category: 'code',
    popular: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read and write Notion pages, databases, and blocks.',
    url: 'https://mcp.notion.com/mcp',
    category: 'productivity',
    popular: true,
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Coordinate tasks, projects, and goals in Asana.',
    url: 'https://mcp.asana.com/v2/mcp',
    category: 'productivity',
    popular: true,
  },
  {
    id: 'amplitude',
    name: 'Amplitude',
    description: 'Retrieve behavioral analytics and product insights from Amplitude.',
    url: 'https://mcp.amplitude.com/mcp',
    category: 'data',
    popular: true,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Bring your Airtable structured data and databases to Claude.',
    url: 'https://mcp.airtable.com/mcp',
    category: 'data',
    popular: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Query payments, customers, subscriptions, and disputes.',
    url: 'https://mcp.stripe.com',
    category: 'financial-services',
    popular: true,
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Access customer conversations, contacts, and support tickets.',
    url: 'https://mcp.intercom.com/mcp',
    category: 'communication',
    popular: true,
  },
  {
    id: 'datadog',
    name: 'Datadog',
    description: 'Query metrics, logs, traces, and alerts from Datadog.',
    url: 'https://mcp.datadoghq.com/api/unstable/mcp-server/mcp',
    category: 'code',
    popular: true,
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    description: 'Manage incidents, schedules, and on-call rotations in PagerDuty.',
    url: 'https://mcp.pagerduty.com/mcp',
    category: 'code',
    popular: true,
  },

  // ── All others ─────────────────────────────────────────────────────────────
  {
    id: 'adobe-experience-manager',
    name: 'Adobe Experience Manager',
    description: 'Manage your Adobe Experience Manager content.',
    url: 'https://mcp.adobeaemcloud.com/adobe/mcp/content',
    category: 'productivity',
    popular: false,
  },
  {
    id: 'ahrefs',
    name: 'Ahrefs',
    description: 'SEO analytics, backlinks, keywords, and AI search data.',
    url: 'https://api.ahrefs.com/mcp/mcp',
    category: 'sales-and-marketing',
    popular: false,
  },
  {
    id: 'attio',
    name: 'Attio',
    description: 'Search, manage, and update your Attio CRM from Claude.',
    url: 'https://mcp.attio.com/mcp',
    category: 'sales-and-marketing',
    popular: false,
  },
  {
    id: 'aws-marketplace',
    name: 'AWS Marketplace',
    description: 'Discover, evaluate, and buy cloud solutions on AWS.',
    url: 'https://aws-mcp.us-east-1.api.aws/mcp',
    category: 'code',
    popular: false,
  },
  {
    id: 'box',
    name: 'Box',
    description: 'Access and manage files, folders, and documents in Box.',
    url: 'https://mcp.box.com',
    category: 'productivity',
    popular: false,
  },
  {
    id: 'brex',
    name: 'Brex',
    description: 'Manage corporate cards, expenses, and budgets in Brex.',
    url: 'https://mcp.brex.com/sse',
    category: 'financial-services',
    popular: false,
  },
  {
    id: 'canva',
    name: 'Canva',
    description: 'Create and edit designs using Canva templates and assets.',
    url: 'https://mcp.canva.com/mcp',
    category: 'design',
    popular: false,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'Manage Cloudflare DNS, Workers, and security settings.',
    url: 'https://mcp.cloudflare.com/mcp',
    category: 'code',
    popular: false,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Access, share, and manage files stored in Dropbox.',
    url: 'https://mcp.dropbox.com/dash',
    category: 'productivity',
    popular: false,
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Inspect and work with Figma designs and components.',
    url: 'https://mcp.figma.com/mcp',
    category: 'design',
    popular: false,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Read and manage files and folders in Google Drive.',
    url: 'https://drivemcp.googleapis.com/mcp/v1',
    category: 'productivity',
    popular: false,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Access contacts, deals, companies, and marketing data from HubSpot.',
    url: 'https://mcp.hubspot.com',
    category: 'sales-and-marketing',
    popular: false,
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Query product analytics and user behavior insights from Mixpanel.',
    url: 'https://mcp.mixpanel.com/mcp',
    category: 'data',
    popular: false,
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Interact with Neon serverless Postgres databases.',
    url: 'https://mcp.neon.tech/mcp',
    category: 'data',
    popular: false,
  },
  {
    id: 'plaid',
    name: 'Plaid',
    description: 'Access financial accounts, transactions, and identity data via Plaid.',
    url: 'https://api.dashboard.plaid.com/mcp',
    category: 'financial-services',
    popular: false,
  },
  {
    id: 'square',
    name: 'Square',
    description: 'Access payments, inventory, customers, and orders from Square.',
    url: 'https://mcp.squareup.com/sse',
    category: 'financial-services',
    popular: false,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Interact with Supabase databases, auth, and storage.',
    url: 'https://mcp.supabase.com/mcp',
    category: 'data',
    popular: false,
  },
];

export const POPULAR_MCP_SERVERS = MCP_SERVERS.filter((s) => s.popular);
