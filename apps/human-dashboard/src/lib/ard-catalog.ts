import { MCP_URL } from './hosts';
import { AGENT_DOMAIN } from './onboarding';
import { SITE_NAME, SITE_ORIGIN } from './seo';

/**
 * Agentic Resource Discovery (ARD v0.91): `/.well-known/ard.json` lists the resources an AI client can use
 * here before it calls any of them. https://agenticresourcediscovery.org/spec/
 */
export const ARD_PATH = '/.well-known/ard.json';

/** Where the catalog is on the canonical site, and where `<link rel="ard">` points. */
export const ARD_HREF = `${SITE_ORIGIN}${ARD_PATH}`;

/** The Agent Skills discovery index this site already serves. */
const SKILLS_INDEX_PATH = '/.well-known/agent-skills/index.json';

const ARD_CONTEXT = 'https://agenticresourcediscovery.org/context/v1';

/**
 * The MCP server card's version, matching `SERVER` in `apps/agent-inbox-mcp/src/index.ts`. The card is
 * advisory: a client checks the live `initialize` response and prefers that.
 */
const MCP_SERVER_VERSION = '0.0.1';

/** The protocol version the hosted server accepts (`protocolVersion` in its tests). */
const MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * Tools `registerTool` exposes in `apps/agent-inbox-mcp/src/tools.ts`. A client still lists them from the
 * server after it connects; these are only so a registry can filter without connecting.
 */
const MCP_TOOLS = [
  'inbox_setup',
  'channel_add',
  'inbox_send',
  'inbox_reply',
  'inbox_wait',
  'inbox_list',
  'inbox_show',
  'inbox_read',
  'inbox_resolve',
  'contact_list',
  'contact_invite',
] as const;

/** Skill folders the connect instructions install from agentinboxhq/skills. */
const SKILL_NAMES = ['agentinbox', 'agentinbox-cli', 'agentinbox-mcp'] as const;

const IDENTIFIER = /^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$/;

type TrustManifest = {
  identity: string;
  identityType: 'https';
};

/** An MCP server card, the artifact an `application/mcp-server-card+json` entry carries. */
export type McpServerCard = {
  $schema: string;
  name: string;
  title: string;
  version: string;
  description: string;
  websiteUrl: string;
  repository: {
    url: string;
    source: 'github';
    subfolder: string;
  };
  remotes: Array<{
    type: 'streamable-http';
    url: string;
    supportedProtocolVersions: string[];
  }>;
};

type ArdEntryBase = {
  '@context': string;
  identifier: string;
  displayName: string;
  description: string;
  type: string;
  capabilities: readonly string[];
  representativeQueries: readonly string[];
  tags: readonly string[];
  trustManifest: TrustManifest;
};

export type ArdEntry = ArdEntryBase & ({ url: string; data?: never } | { data: McpServerCard; url?: never });

export type ArdCatalog = {
  entries: ArdEntry[];
};

/** The catalog published at `ARD_PATH`. */
export function ardCatalog(): ArdCatalog {
  return {
    entries: [mcpEntry(), skillsEntry()],
  };
}

/** The hosted inbox MCP server, with its server card inline so a client can connect without a second lookup. */
function mcpEntry(): ArdEntry {
  return {
    '@context': ARD_CONTEXT,
    identifier: urn('mcp', 'inbox'),
    displayName: `${SITE_NAME} MCP`,
    description:
      'Hosted MCP server for the Agent Inbox. An AI tool adds it, the person signs in, and the tool can ask them, request approval, or send an update on email, Slack, and Telegram.',
    type: 'application/mcp-server-card+json',
    data: mcpServerCard(),
    capabilities: MCP_TOOLS,
    representativeQueries: [
      'ask my human to approve this deploy',
      'send an email from my agent inbox',
      'list unread conversations in agent inbox',
      'connect my chat app to the agent inbox MCP server',
    ],
    tags: ['inbox', 'email', 'slack', 'telegram', 'mcp', 'human-in-the-loop'],
    trustManifest: trustManifest(),
  };
}

/** The skills index `npx skills add` reads, so a client can install the Agent Inbox skills from this domain. */
function skillsEntry(): ArdEntry {
  return {
    '@context': ARD_CONTEXT,
    identifier: urn('skills', 'index'),
    displayName: `${SITE_NAME} skills`,
    description:
      'Agent Skills for the Agent Inbox CLI and MCP server: how to reach a person, and how to connect a host.',
    type: 'application/agent-skills+json',
    url: `${SITE_ORIGIN}${SKILLS_INDEX_PATH}`,
    capabilities: SKILL_NAMES,
    representativeQueries: [
      'install the agent inbox skill',
      'how should an agent ask a person for approval',
      'add the agent inbox skills to this project',
    ],
    tags: ['inbox', 'skills', 'cli', 'mcp'],
    trustManifest: trustManifest(),
  };
}

/**
 * The server card for `https://mcp.agentinbox.md`. Its `name` is reverse-DNS, as a server card requires;
 * the running server still introduces itself as `agent-inbox`.
 */
export function mcpServerCard(): McpServerCard {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: 'md.agentinbox/agent-inbox',
    title: SITE_NAME,
    version: MCP_SERVER_VERSION,
    description:
      'Email, Slack, and Telegram inbox for AI agents. Ask a person, request approval, offer a choice, or send an update, then read the answer.',
    websiteUrl: `${SITE_ORIGIN}/`,
    repository: {
      url: 'https://github.com/novuhq/novu',
      source: 'github',
      subfolder: 'apps/agent-inbox-mcp',
    },
    remotes: [
      {
        type: 'streamable-http',
        url: MCP_URL,
        supportedProtocolVersions: [MCP_PROTOCOL_VERSION],
      },
    ],
  };
}

function urn(namespace: string, name: string): string {
  const identifier = `urn:air:${AGENT_DOMAIN}:${namespace}:${name}`;
  if (!IDENTIFIER.test(identifier)) {
    throw new Error(`ARD identifier ${identifier} is not a domain-anchored URN`);
  }

  return identifier;
}

/** Publisher identity bound to the same domain the entry's identifier names. */
function trustManifest(): TrustManifest {
  return {
    identity: `https://${AGENT_DOMAIN}`,
    identityType: 'https',
  };
}
