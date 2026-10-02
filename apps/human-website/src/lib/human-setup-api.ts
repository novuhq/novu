import 'server-only';

import { safeJson, unwrapData } from './api-response';
import type { HumanRegion } from './human-accounts-api';
import { resolveNovuApiUrl } from './novu-api';

/** The relay agent `human setup` creates; the claim keeps its identifier. */
const RELAY_AGENT_IDENTIFIER = 'human-relay';

export type SetupChannel = { identifier: string; label: string; active: boolean };
export type SetupContact = { id: string; name: string; email?: string };

type AgentIntegrationLink = {
  integration: { identifier: string; providerId: string; channel?: string; active?: boolean };
};

type Contact = { id: string; firstName?: string; lastName?: string; email?: string };

/**
 * Reads an operator's setup from the regular Novu API with their environment's secret key,
 * the same calls the CLI makes. Runs on the server only; the key never reaches the browser.
 */
export async function listRelayChannels(region: HumanRegion, secretKey: string): Promise<SetupChannel[]> {
  const links = await get<AgentIntegrationLink[]>(
    region,
    secretKey,
    `/v1/agents/${RELAY_AGENT_IDENTIFIER}/integrations`,
    // No relay yet: the operator signed up without claiming a setup.
    { notFound: [] }
  );

  return links.map(({ integration }) => ({
    identifier: integration.identifier,
    label: channelLabel(integration.providerId, integration.channel),
    active: integration.active !== false,
  }));
}

export async function listContacts(region: HumanRegion, secretKey: string): Promise<SetupContact[]> {
  const contacts = await get<Contact[]>(region, secretKey, '/v1/human/contacts?limit=50');

  return contacts.map((contact) => ({
    id: contact.id,
    name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.id,
    email: contact.email,
  }));
}

function channelLabel(providerId: string, channel?: string): string {
  if (providerId.includes('telegram')) return 'Telegram';
  if (providerId.includes('slack')) return 'Slack';
  if (channel === 'email') return 'Email';

  return providerId;
}

async function get<T>(
  region: HumanRegion,
  secretKey: string,
  path: string,
  fallbacks: { notFound?: T } = {}
): Promise<T> {
  const response = await fetch(`${resolveNovuApiUrl(region)}${path}`, {
    headers: { Authorization: `ApiKey ${secretKey}` },
    cache: 'no-store',
  });

  if (response.status === 404 && fallbacks.notFound !== undefined) {
    return fallbacks.notFound;
  }

  if (!response.ok) {
    throw new Error(`Novu API request ${path} failed (${response.status})`);
  }

  return unwrapData<T>(await safeJson(response));
}
