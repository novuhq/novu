/**
 * Shared vocabulary for the human-in-the-loop interaction API
 * (`/v1/human/interactions`, the `@novu/human` CLI, and the
 * `human_relay` agent runtime).
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

export type HumanInteractionResponse = {
  type: 'text' | 'option';
  /** Freeform reply text for `ask`. */
  text?: string;
  /** `approve`: 'approve' | 'deny'; `choose`: the picked option id. */
  optionId?: string;
  /** Subscriber id (or platform user id) of whoever responded. */
  respondedBy?: string;
  respondedAt: string;
};

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
 * Hard cap on `--ttl`. Card action tokens are cached for 3 days
 * (see AgentActionTokenService); buttons must not outlive their tokens.
 */
export const HUMAN_INTERACTION_MAX_TTL_SECONDS = 72 * 60 * 60;
