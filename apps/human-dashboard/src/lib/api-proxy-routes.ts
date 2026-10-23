/**
 * Agent Inbox's API routes the dashboard proxy forwards to the Novu API. Kept free of Next.js / server-only
 * so unit tests can assert which paths the CLI and MCP server may call.
 */
export type ProxyRoute = readonly [method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, novuPath: string];

export const PROXY_ROUTES: readonly ProxyRoute[] = [
  ['GET', '/v1/inbox', '/v1/human/inbox'],
  ['POST', '/v1/inbox/messages', '/v1/human/interactions'],
  ['GET', '/v1/inbox/messages/:messageId', '/v1/human/interactions/:messageId'],
  ['GET', '/v1/inbox/:conversationId', '/v1/human/inbox/:conversationId'],
  ['POST', '/v1/inbox/:conversationId/read', '/v1/human/inbox/:conversationId/read'],
  ['POST', '/v1/inbox/:conversationId/resolve', '/v1/human/inbox/:conversationId/resolve'],

  ['GET', '/v1/contacts', '/v1/human/contacts'],
  ['GET', '/v1/contacts/:contactId', '/v1/human/contacts/:contactId'],
  ['POST', '/v1/contacts/invites', '/v1/human/invites'],
  ['POST', '/v1/contacts/verifications', '/v1/human/verifications'],

  ['GET', '/v1/channels', '/v1/agents/:agentIdentifier/integrations'],
  ['POST', '/v1/channels', '/v1/agents/:agentIdentifier/integrations'],
  ['GET', '/v1/channels/apps', '/v1/integrations'],
  ['POST', '/v1/channels/apps', '/v1/integrations'],
  ['POST', '/v1/channels/apps/:appId/telegram-link', '/v1/integrations/:appId/mobile-link'],
  ['POST', '/v1/channels/apps/:appId/slack-quick-setup', '/v1/integrations/:appId/slack-quick-setup'],
  [
    'POST',
    '/v1/channels/apps/:appId/slack-setup-link',
    '/v1/agents/:agentIdentifier/integrations/:appId/slack/setup-link',
  ],
  ['GET', '/v1/channels/telegram/setup', '/v1/integrations/mobile-configure/status'],
  ['POST', '/v1/channels/telegram/setup', '/v1/integrations/mobile-configure'],
  ['POST', '/v1/channels/telegram/link', '/v1/integrations/channel-endpoints/link'],
  ['GET', '/v1/channels/links', '/v1/channel-endpoints'],
  ['POST', '/v1/channels/slack/install-link', '/v1/integrations/channel-connections/oauth'],
  ['GET', '/v1/channels/slack/setup', '/v1/agents/public/slack/setup/status'],
  ['POST', '/v1/channels/slack/setup', '/v1/agents/public/slack/setup'],

  ['POST', '/v1/setup', '/v1/human/setup'],
  ['POST', '/v1/setup/keyless', '/v1/inbox/session'],
  ['GET', '/v1/inbox-address', '/v1/human/inbox-address'],
  ['GET', '/v1/agent', '/v1/human/agent'],
  ['PUT', '/v1/agent/picture', '/v1/human/agent/picture'],
  ['POST', '/v1/login', '/v1/cli/device-sessions'],
  ['POST', '/v1/login/claim', '/v1/human/claim-token'],
  ['POST', '/v1/login/:deviceCode/poll', '/v1/cli/device-sessions/:deviceCode/poll'],
  ['GET', '/v1/operator', '/v1/human/operator'],
  ['POST', '/v1/connect', '/v1/human/connect'],

  ['GET', '/v1/invites/status', '/v1/human/invites/status'],
  ['POST', '/v1/invites/connect', '/v1/human/invites/connect'],
  ['POST', '/v1/invites/default', '/v1/human/invites/default'],
  ['POST', '/v1/invites/decline', '/v1/human/invites/decline'],
  ['POST', '/v1/verify', '/v1/human/verify'],
  [
    'GET',
    '/v1/agent-pictures/:environmentId/:agentId/:version',
    '/v1/human/agent-pictures/:environmentId/:agentId/:version',
  ],
];

/** Whether the dashboard proxy forwards this method and path to the Novu API. */
export function isProxiedRoute(method: string, path: string): boolean {
  return PROXY_ROUTES.some(([routeMethod, routePath]) => routeMethod === method && routePath === path);
}
