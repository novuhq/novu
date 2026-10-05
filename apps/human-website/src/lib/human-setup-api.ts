import 'server-only';

import { type JsonBody, safeJson, unwrapData } from './api-response';
import type { HumanRegion } from './human-accounts-api';
import { resolveNovuApiUrl } from './novu-api';

/** The relay agent `human setup` creates; the claim keeps its identifier. */
const RELAY_AGENT_IDENTIFIER = 'human-relay';
const CONTACTS_PAGE_SIZE = 50;

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
  // A 404 means there's no relay yet: nothing has been claimed into this account.
  const body = await get(region, secretKey, `/v1/agents/${RELAY_AGENT_IDENTIFIER}/integrations`, {
    allowNotFound: true,
  });
  const links = body ? unwrapData<AgentIntegrationLink[]>(body) : [];

  return links.map(({ integration }) => ({
    identifier: integration.identifier,
    label: channelLabel(integration.providerId, integration.channel),
    active: integration.active !== false,
  }));
}

/** The first page of contacts; `hasMore` says whether the API has more after it. */
export async function listContacts(
  region: HumanRegion,
  secretKey: string
): Promise<{ contacts: SetupContact[]; hasMore: boolean }> {
  const page = (await get(region, secretKey, `/v1/human/contacts?limit=${CONTACTS_PAGE_SIZE}`)) as {
    data?: Contact[];
    next?: string | null;
  } | null;
  const contacts = Array.isArray(page?.data) ? page.data : [];

  return {
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.id,
      email: contact.email,
    })),
    hasMore: Boolean(page?.next),
  };
}

function channelLabel(providerId: string, channel?: string): string {
  if (providerId.includes('telegram')) return 'Telegram';
  if (providerId.includes('slack')) return 'Slack';
  if (channel === 'email') return 'Email';

  return providerId;
}

async function get(
  region: HumanRegion,
  secretKey: string,
  path: string,
  { allowNotFound = false }: { allowNotFound?: boolean } = {}
): Promise<JsonBody> {
  const response = await fetch(`${resolveNovuApiUrl(region)}${path}`, {
    headers: { Authorization: `ApiKey ${secretKey}` },
    cache: 'no-store',
  });

  if (allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Novu API request ${path} failed (${response.status})`);
  }

  return safeJson(response);
}
