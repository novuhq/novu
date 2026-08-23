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
 * delivered as a one-off message on a chat channel via the `human_relay`
 * agent. The row is the source of truth the `@novu/human` CLI long-polls
 * while it blocks waiting for the human.
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

  /** External subscriberId of the human being addressed. */
  subscriberId: string;

  /** The hidden `human_relay` agent that owns delivery + webhooks. */
  _agentId: string;

  integrationIdentifier: string;

  /** Platform slug (telegram | slack | ...). */
  platform: string;

  /** Platform thread the card was delivered on — reply-to correlation + edits. */
  platformThreadId?: string;

  /** Platform message id of the delivered card — exact reply-to matching. */
  platformMessageId?: string;

  /** Conversation the delivery/reply is threaded on, once one exists. */
  _conversationId?: string;

  response?: HumanInteractionResponse;

  expiresAt: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type HumanInteractionDBModel = ChangePropsValueType<
  HumanInteractionEntity,
  '_environmentId' | '_organizationId' | '_agentId' | '_conversationId'
>;
