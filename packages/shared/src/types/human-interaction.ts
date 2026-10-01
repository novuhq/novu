import type { CardElement } from './card-element.types';

/**
 * Shared vocabulary for the human-in-the-loop interaction API
 * (`/v1/human/interactions`, the `@novu/human` CLI, `human_relay`,
 * and custom code agents `ctx.*` helpers).
 */

export enum HumanInteractionKindEnum {
  ASK = 'ask',
  APPROVE = 'approve',
  CHOOSE = 'choose',
  TELL = 'tell',
}

export enum HumanInteractionStatusEnum {
  /** Delivered (or delivering) and waiting on the human. */
  PENDING = 'pending',
  /** `ask`/`choose` resolved with a reply or an option pick. */
  ANSWERED = 'answered',
  /** `approve` resolved positively. */
  APPROVED = 'approved',
  /** `approve` resolved negatively. */
  DENIED = 'denied',
  /** TTL elapsed before the human responded. */
  EXPIRED = 'expired',
  /** Cancelled by the caller before resolution. */
  CANCELED = 'canceled',
  /** Terminal state for `tell` — nothing to wait on. */
  DELIVERED = 'delivered',
}

export const HUMAN_INTERACTION_TERMINAL_STATUSES: readonly HumanInteractionStatusEnum[] = [
  HumanInteractionStatusEnum.ANSWERED,
  HumanInteractionStatusEnum.APPROVED,
  HumanInteractionStatusEnum.DENIED,
  HumanInteractionStatusEnum.EXPIRED,
  HumanInteractionStatusEnum.CANCELED,
  HumanInteractionStatusEnum.DELIVERED,
];

export type HumanInteractionOption = {
  id: string;
  label: string;
};

/** String is shorthand for `{ id: minted opt_N, label }`. Structured `{ id, label }` keeps a stable id. */
export type HumanOptionInput = string | HumanInteractionOption;

export type HumanInteractionCardBase = {
  title: string;
  icon?: string;
  subtitle?: string;
  body?: string;
};

export type HumanInteractionAskCard = HumanInteractionCardBase;
export type HumanInteractionTellCard = HumanInteractionCardBase;

export type HumanInteractionApproveCard = HumanInteractionCardBase & {
  approveLabel?: string;
  denyLabel?: string;
  extraActions?: HumanInteractionOption[];
};

export type HumanInteractionChooseCard = HumanInteractionCardBase & {
  options: HumanInteractionOption[];
};

/** Chrome persisted on `content.cardChrome`. */
export type CardChrome =
  | HumanInteractionAskCard
  | HumanInteractionApproveCard
  | HumanInteractionChooseCard
  | HumanInteractionTellCard;

export type HumanInteractionChromeContent = {
  cardChrome: CardChrome;
};

export type HumanInteractionPostedContent = {
  card: CardElement;
};

/** Persisted HITL `content`. */
export type HumanInteractionContent = HumanInteractionChromeContent | HumanInteractionPostedContent;

export function isHumanCardElement(card: unknown): card is CardElement {
  return (
    typeof card === 'object' && card !== null && !Array.isArray(card) && (card as { type?: unknown }).type === 'card'
  );
}

export function isHumanCardElementContent(content: unknown): content is HumanInteractionPostedContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    !Array.isArray(content) &&
    isHumanCardElement((content as { card?: unknown }).card)
  );
}

export function isHumanChromeContent(content: unknown): content is HumanInteractionChromeContent {
  if (typeof content !== 'object' || content === null || Array.isArray(content)) {
    return false;
  }

  const chrome = (content as { cardChrome?: unknown }).cardChrome;

  return typeof chrome === 'object' && chrome !== null && !Array.isArray(chrome);
}

/** Extra approve buttons after Approve / Deny (Always allow, author extras). */
export const HUMAN_INTERACTION_MAX_EXTRA_ACTIONS = 4;

export const HUMAN_INTERACTION_RESERVED_OPTION_IDS = ['approve', 'deny'] as const;

export const HUMAN_TRUST_TOOL_OPTION_ID = 'trust-tool' as const;
export const HUMAN_TRUST_SERVER_OPTION_ID = 'trust-server' as const;

export type HumanInteractionCardSource = {
  kind: HumanInteractionKindEnum;
  content: HumanInteractionContent;
};

export function mintHumanOptions(inputs: HumanOptionInput[]): HumanInteractionOption[] {
  return inputs.map((input, index) => {
    if (typeof input === 'string') {
      return { id: `opt_${index + 1}`, label: input };
    }

    return { id: input.id, label: input.label };
  });
}

function chromeFromContent(content: HumanInteractionContent): CardChrome | undefined {
  if (isHumanChromeContent(content)) {
    return content.cardChrome;
  }

  if (isHumanCardElementContent(content)) {
    const title = content.card.title?.trim();

    return title ? { title } : undefined;
  }

  return undefined;
}

export function resolveHumanInteractionCard(source: HumanInteractionCardSource): CardChrome {
  const chrome = chromeFromContent(source.content);
  const title = chrome?.title?.trim() || '';
  const icon = chrome?.icon;
  const subtitle = chrome?.subtitle;
  const body = chrome?.body;
  const presentation = {
    title,
    ...(icon ? { icon } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(body ? { body } : {}),
  };

  if (source.kind === HumanInteractionKindEnum.CHOOSE) {
    const rawOptions = chrome && 'options' in chrome && chrome.options?.length ? chrome.options : [];

    return {
      ...presentation,
      options: mintHumanOptions(rawOptions),
    };
  }

  if (source.kind === HumanInteractionKindEnum.APPROVE) {
    const extraActions =
      chrome && 'extraActions' in chrome && chrome.extraActions?.length
        ? mintHumanOptions(chrome.extraActions)
        : undefined;
    const approveLabel = chrome && 'approveLabel' in chrome ? chrome.approveLabel : undefined;
    const denyLabel = chrome && 'denyLabel' in chrome ? chrome.denyLabel : undefined;

    return {
      ...presentation,
      ...(approveLabel ? { approveLabel } : {}),
      ...(denyLabel ? { denyLabel } : {}),
      ...(extraActions?.length ? { extraActions } : {}),
    };
  }

  return presentation;
}

export function humanInteractionCardTitle(source: HumanInteractionCardSource): string {
  return resolveHumanInteractionCard(source).title;
}

export function humanInteractionChooseOptions(source: HumanInteractionCardSource): HumanInteractionOption[] {
  const card = resolveHumanInteractionCard(source);

  return 'options' in card ? card.options : [];
}

export function humanInteractionApproveExtraActions(source: HumanInteractionCardSource): HumanInteractionOption[] {
  const card = resolveHumanInteractionCard(source);

  return 'extraActions' in card && card.extraActions ? card.extraActions : [];
}

export type HumanInteractionResponse = {
  type: 'text' | 'option';
  /** Freeform reply text for `ask`. */
  text?: string;
  /** `approve`: 'approve' | 'deny'; `choose`: the picked option id. */
  optionId?: string;
  /** Display name of whoever responded (firstName, else platform username, else subscriberId). */
  respondedBy?: string;
  /** Stable Novu subscriberId of whoever settled the interaction. */
  respondedBySubscriberId?: string;
  respondedAt: string;
};

/** Hard cap on `to` recipient lists for `ctx.*` and `POST /v1/human/interactions`. */
export const HUMAN_INTERACTION_MAX_RECIPIENTS = 50;

/** `choose` must have at least two options and at most this many (chat button UIs truncate). */
export const HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS = 10;

/**
 * Delivery channel preference on create. The API resolves the concrete
 * integration from the relay agent's linked integrations + the human's
 * endpoints — callers never pass an integration identifier.
 */
export enum HumanChannelViaEnum {
  TELEGRAM = 'telegram',
  SLACK = 'slack',
  EMAIL = 'email',
}

/** Default lifetime of a pending interaction. */
export const HUMAN_INTERACTION_DEFAULT_TTL_SECONDS = 24 * 60 * 60;

/**
 * Hard cap on `--ttl`. Card action tokens are cached for 5 days
 * (see AgentActionTokenService); buttons must not outlive their tokens.
 */
export const HUMAN_INTERACTION_MAX_TTL_SECONDS = 5 * 24 * 60 * 60;
