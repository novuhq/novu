import type {
  HumanInteractionKindEnum,
  HumanInteractionOption,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
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

  /** The question / action description / message shown to the human. */
  prompt: string;

  /** `choose` options. `approve` uses implicit approve/deny buttons. */
  options?: HumanInteractionOption[];

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

  response?: HumanInteractionResponse;

  expiresAt: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export interface HumanInteractionDelivery {
  subscriberId: string;
  integrationIdentifier: string;
  platform: string;
  platformMessageId: string;
  platformThreadId: string;
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
