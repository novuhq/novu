import type {
  HumanInteractionContent,
  HumanInteractionKindEnum,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
  VoiceCallEndReasonEnum,
  VoiceCallFailure,
} from '@novu/shared';
import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

/**
 * A single agent-initiated human interaction (ask / approve / choose / tell)
 * delivered as a one-off DM or an in-thread card. The row is the source of
 * truth the `@novu/human` CLI long-polls and `ctx.humanResponse` correlates on.
 */
export class HumanInteractionEntity {
  _id: string;

  /** Public identifier used by the CLI/API — `hi_<nanoid>`. */
  identifier: string;

  kind: HumanInteractionKindEnum;

  status: HumanInteractionStatusEnum;

  /** Required `{ cardChrome }` | `{ card }`. */
  content: HumanInteractionContent;

  /** `--from` attribution rendered in the card ("deploy-bot needs approval"). */
  fromLabel?: string;

  /**
   * Client-minted id from `ctx.ask` / `ctx.approve` / `ctx.choose` so the
   * later `onMessage` / `onAction` turn can correlate the answer via
   * `ctx.humanResponse.requestId`.
   */
  requestId?: string;

  /** All Novu subscriberIds allowed to settle. First valid answer wins. */
  subscriberIds: string[];

  /**
   * Sent into a thread without naming anyone, so whoever is in that thread may settle, including
   * people who are not subscribers. `subscriberIds` is then only who was in the thread at send time.
   */
  anyoneMayAnswer?: boolean;

  /** Agent that owns delivery and the inbound webhook. */
  _agentId: string;

  /**
   * Per-recipient delivery refs. In-thread cards write a single element
   * (the current conversation) even when `subscriberIds` lists several
   * people who may settle. Public/CLI fan-out writes one per successful DM.
   */
  deliveries?: HumanInteractionDelivery[];

  /** Conversation the delivery/reply is threaded on, once one exists. */
  _conversationId?: string;

  /**
   * Minutes still held against the voice cap for this interaction. Set when a
   * voice send stays pending; settlement releases them. Absent for every other channel.
   */
  voiceMinutesReserved?: number;

  /** When those minutes were reserved. Settlement refunds that Redis day, not `createdAt`. */
  voiceMinutesReservedAt?: string;

  /**
   * Set when an outbound call never connected. The status is `failed`.
   * Absent for every other channel and for a call that connected.
   */
  voiceFailure?: VoiceCallFailure;

  /**
   * Contacts this pending row is calling. A fan-out can mix voice with other
   * channels, so the row's `subscriberIds` alone is not "on a call".
   */
  voiceSubscriberIds?: string[];

  response?: HumanInteractionResponse;

  expiresAt: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

/** A connected call ended. Absent while the call can still be answered. */
export interface VoiceCallEnded {
  reason: VoiceCallEndReasonEnum;
  endedAt: string;
  durationSeconds?: number;
}

export interface HumanInteractionDelivery {
  subscriberId: string;
  integrationIdentifier: string;
  platform: string;
  platformMessageId: string;
  platformThreadId: string;
  /** This recipient's call never connected. Other recipients on the row can still answer. */
  voiceFailure?: VoiceCallFailure;
  /**
   * This recipient's call connected and later ended without a commitment.
   * Excluded from the live-call lock; does not make the interaction `failed`.
   */
  voiceCallEnded?: VoiceCallEnded;
}

export function primaryHumanInteractionDelivery(
  interaction: Pick<HumanInteractionEntity, 'deliveries'>
): HumanInteractionDelivery | undefined {
  return interaction.deliveries?.[0];
}

export type HumanInteractionDBModel = ChangePropsValueType<
  HumanInteractionEntity,
  '_environmentId' | '_organizationId' | '_agentId' | '_conversationId'
>;
