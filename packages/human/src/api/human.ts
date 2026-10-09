import { HumanApiClient, unwrap } from './client';

export type InteractionKind = 'ask' | 'approve' | 'choose' | 'tell';

export type InteractionStatus = 'pending' | 'answered' | 'approved' | 'denied' | 'expired' | 'canceled' | 'delivered';

export type HumanInteractionOption = { id: string; label: string };

/** String is shorthand for `{ id: minted opt_N, label }`; structured `{ id, label }` keeps a stable id. */
export type HumanOptionInput = string | HumanInteractionOption;

export interface InteractionCard {
  title?: string;
  icon?: string;
  subtitle?: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
  extraActions?: HumanInteractionOption[];
  options?: HumanInteractionOption[];
}

export type CreateInteractionCard = Omit<InteractionCard, 'extraActions' | 'options'> & {
  title: string;
  extraActions?: HumanOptionInput[];
  options?: HumanOptionInput[];
};

/** Posted chat card element. Structural subset of `CardElement` in `@novu/shared`. */
export type InteractionCardElement = {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children?: unknown[];
};

/**
 * Persisted HITL content returned by the API — either normalized chrome
 * (`cardChrome`) or a posted chat card element (`card`). Mirrors
 * `HumanInteractionContent` in `@novu/shared`; kept as a local structural copy
 * because the CLI cannot depend on `@novu/shared`.
 */
export type InteractionContent = { cardChrome: InteractionCard } | { card: InteractionCardElement };

export interface Interaction {
  id: string;
  kind: InteractionKind;
  status: InteractionStatus;
  content: InteractionContent;
  from?: string;
  to: string[];
  integrationIdentifier: string;
  platform: string;
  response?: {
    type: 'text' | 'option';
    text?: string;
    optionId?: string;
    respondedBy?: string;
    respondedBySubscriberId?: string;
    respondedAt: string;
  };
  failedTo?: string[];
  expiresAt: string;
  createdAt: string;
}

export function isInteractionChrome(content: InteractionContent): content is { cardChrome: InteractionCard } {
  return 'cardChrome' in content;
}

export function isInteractionCardElement(content: InteractionContent): content is { card: InteractionCardElement } {
  return 'card' in content && (content as { card?: { type?: string } }).card?.type === 'card';
}

function collectCardButtons(node: unknown, into: HumanInteractionOption[] = []): HumanInteractionOption[] {
  if (Array.isArray(node)) {
    for (const child of node) collectCardButtons(child, into);

    return into;
  }

  if (typeof node !== 'object' || node === null) {
    return into;
  }

  const record = node as { id?: unknown; label?: unknown; children?: unknown };
  if (typeof record.id === 'string' && typeof record.label === 'string') {
    into.push({ id: record.id, label: record.label });
  }

  if (record.children !== undefined) {
    collectCardButtons(record.children, into);
  }

  return into;
}

/** Title shown in lists — from chrome or the posted card element. */
export function interactionTitle(interaction: Interaction): string {
  const { content } = interaction;

  if (isInteractionChrome(content)) {
    return content.cardChrome.title ?? '';
  }

  return content.card.title ?? '';
}

/** Selectable options for `choose` — chrome options, or buttons on a posted card. */
export function interactionOptions(interaction: Interaction): HumanInteractionOption[] {
  const { content } = interaction;

  if (isInteractionChrome(content)) {
    return content.cardChrome.options ?? [];
  }

  return collectCardButtons(content.card.children);
}

export interface CreateInteractionInput {
  kind: InteractionKind;
  card: CreateInteractionCard;
  to: string | string[];
  via?: string;
  agentIdentifier?: string;
  from?: string;
  ttlSeconds?: number;
}

export async function createInteraction(client: HumanApiClient, input: CreateInteractionInput): Promise<Interaction> {
  const res = await client.axios.post<{ data?: Interaction } | Interaction>('/v1/human/interactions', input);

  return unwrap(res.data);
}

export async function getInteraction(client: HumanApiClient, id: string): Promise<Interaction> {
  const res = await client.axios.get<{ data?: Interaction } | Interaction>(
    `/v1/human/interactions/${encodeURIComponent(id)}`
  );

  return unwrap(res.data);
}

export async function listInteractions(
  client: HumanApiClient,
  query: { status?: InteractionStatus; to?: string; limit?: number }
): Promise<Interaction[]> {
  const res = await client.axios.get<{ data?: Interaction[] } | Interaction[]>('/v1/human/interactions', {
    params: query,
  });

  return unwrap(res.data);
}

export async function cancelInteraction(client: HumanApiClient, id: string): Promise<Interaction> {
  const res = await client.axios.post<{ data?: Interaction } | Interaction>(
    `/v1/human/interactions/${encodeURIComponent(id)}/cancel`,
    {}
  );

  return unwrap(res.data);
}

export interface SetupHumanRelayResult {
  agentId: string;
  agentIdentifier: string;
  /** What the relay agent is called. Missing from APIs older than agent names. */
  agentName?: string;
  subscriberId: string;
}

export async function setupHumanRelay(
  client: HumanApiClient,
  input: {
    subscriberId: string;
    /**
     * Set up the account owner. The API answers with the operator it has on record, which can differ
     * from `subscriberId` when the account was first set up elsewhere.
     */
    operator?: boolean;
    agentIdentifier?: string;
    /** What the relay agent is called from now on. Missing leaves the name it has. */
    agentName?: string;
    /** A line about what the relay agent does. An empty one clears it. */
    agentDescription?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    /** The inviter's `--via` pick; becomes the human's default channel unless they chose one themselves. */
    defaultVia?: 'telegram' | 'slack' | 'email';
  }
): Promise<SetupHumanRelayResult> {
  const res = await client.axios.post<{ data?: SetupHumanRelayResult } | SetupHumanRelayResult>(
    '/v1/human/setup',
    input
  );

  return unwrap(res.data);
}

export interface HumanAgent {
  agentId: string;
  agentIdentifier: string;
  name: string;
  description?: string;
  /** Where anyone can load the agent's picture. Missing when it has none. */
  pictureUrl?: string;
}

/** Renames or describes the relay agent. People see it on the invite page, in emails and on its Telegram bot. */
export async function updateHumanAgent(
  client: HumanApiClient,
  input: { agentIdentifier?: string; name?: string; description?: string }
): Promise<HumanAgent> {
  const res = await client.axios.patch<{ data?: HumanAgent } | HumanAgent>('/v1/human/agent', input);

  return unwrap(res.data);
}

/** Names the relay agent a call is about. Left out, the API takes the default one. */
function agentParams(agentIdentifier: string | undefined): { params?: { agentIdentifier: string } } {
  return agentIdentifier ? { params: { agentIdentifier } } : {};
}

/** The relay agent with its name, description and picture. */
export async function getHumanAgent(client: HumanApiClient, agentIdentifier?: string): Promise<HumanAgent> {
  const res = await client.axios.get<{ data?: HumanAgent } | HumanAgent>(
    '/v1/human/agent',
    agentParams(agentIdentifier)
  );

  return unwrap(res.data);
}

/** Uploads the relay agent's picture: a JPEG or PNG of up to 2 MB. Needs an account (`human login`). */
export async function setHumanAgentPicture(
  client: HumanApiClient,
  picture: { file: Buffer; contentType: string },
  agentIdentifier?: string
): Promise<HumanAgent> {
  const form = new FormData();
  form.append('picture', new Blob([new Uint8Array(picture.file)], { type: picture.contentType }), 'picture');
  const res = await client.axios.put<{ data?: HumanAgent } | HumanAgent>(
    '/v1/human/agent/picture',
    form,
    agentParams(agentIdentifier)
  );

  return unwrap(res.data);
}

export async function removeHumanAgentPicture(client: HumanApiClient, agentIdentifier?: string): Promise<HumanAgent> {
  const res = await client.axios.delete<{ data?: HumanAgent } | HumanAgent>(
    '/v1/human/agent/picture',
    agentParams(agentIdentifier)
  );

  return unwrap(res.data);
}

export interface HumanInviteChannel {
  via: 'telegram' | 'slack';
  integrationIdentifier: string;
  connected: boolean;
}

/** A shareable invite page where the human connects any of the relay's chat channels. */
export interface HumanInvite {
  url: string;
  /** ISO timestamp after which the invite link stops working. */
  expiresAt: string;
  channels: HumanInviteChannel[];
}

export async function createHumanInvite(
  client: HumanApiClient,
  input: { subscriberId: string; agentIdentifier?: string; firstName?: string; lastName?: string }
): Promise<HumanInvite> {
  const res = await client.axios.post<{ data?: HumanInvite } | HumanInvite>('/v1/human/invites', input);

  return unwrap(res.data);
}

/** A contact is a subscriber in the environment — `id` is the subscriberId `--to` addresses. */
export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsPage {
  data: Contact[];
  next: string | null;
}

export async function listContacts(
  client: HumanApiClient,
  params: { limit?: number; after?: string } = {}
): Promise<ContactsPage> {
  const res = await client.axios.get<{ data?: Contact[]; next?: string | null }>('/v1/human/contacts', { params });
  const body = res.data;

  return { data: Array.isArray(body?.data) ? body.data : [], next: body?.next ?? null };
}
