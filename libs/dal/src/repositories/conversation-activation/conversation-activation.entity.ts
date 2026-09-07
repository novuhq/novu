import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

/** Why an engagement was counted as a new active conversation. */
export enum ConversationActivationReasonEnum {
  /** First agent engagement on a brand-new conversation. */
  NEW = 'new',
  /** Agent engaged after the conversation had been resolved. */
  REOPEN = 'reopen',
  /** Agent engaged after the rolling inactivity window had lapsed. */
  WINDOW_EXPIRED = 'window_expired',
  /** Agent engaged on a continuing conversation in a new billing period. */
  NEW_CYCLE = 'new_cycle',
}

/** Whether the thread the activation occurred on is a direct message or a group. */
export enum ConversationThreadKindEnum {
  DIRECT = 'direct',
  GROUP = 'group',
}

/**
 * Append-only audit record of a counted active-conversation activation. One row
 * is written each time `ConversationActivationService` counts a conversation as
 * active. The per-organization, per-period count of these rows is the usage
 * number surfaced to billing and the dashboard.
 */
export class ConversationActivationEntity {
  _id: string;

  _conversationId: string;

  _agentId: string;

  /** Platform slug the activation occurred on (slack | whatsapp | telegram | email | teams). */
  platform: string;

  threadKind: ConversationThreadKindEnum;

  reason: ConversationActivationReasonEnum;

  /** Billing period key (YYYY-MM, UTC) this activation is counted against. */
  periodKey: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;
}

export type ConversationActivationDBModel = ChangePropsValueType<
  ConversationActivationEntity,
  '_conversationId' | '_agentId' | '_environmentId' | '_organizationId'
>;
