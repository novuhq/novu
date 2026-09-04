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

export async function setupHumanRelay(
  client: HumanApiClient,
  input: { subscriberId: string; agentIdentifier?: string; email?: string }
): Promise<{ agentId: string; agentIdentifier: string; subscriberId: string }> {
  const res = await client.axios.post<
    | { data?: { agentId: string; agentIdentifier: string; subscriberId: string } }
    | {
        agentId: string;
        agentIdentifier: string;
        subscriberId: string;
      }
  >('/v1/human/setup', input);

  return unwrap(res.data);
}
