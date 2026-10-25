import type { HumanChannelViaEnum } from '@novu/shared';
import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

/** Who picked the default channel. The person's own choice always wins over the inviter's. */
export type HumanContactDefaultSetBy = 'inviter' | 'contact';

/** An address waiting on double opt-in. One pending slot per channel. */
export interface HumanContactPendingAddress {
  /** Normalized address (lowercase email). */
  address: string;
  requestedAt: string;
}

/** An address that passed double opt-in. One verified slot per channel. */
export interface HumanContactVerifiedAddress {
  /** Normalized address (lowercase email). */
  address: string;
  requestedAt: string;
  verifiedAt: string;
}

/**
 * An address that was typed but not confirmed. Contact-id delivery never uses it.
 * A non-keyless org may email it when one send names that address. It also lets
 * the inbox recognize mail from that address.
 */
export interface HumanContactDeclaredAddress {
  /** Normalized address (lowercase email). */
  address: string;
  declaredAt: string;
}

/**
 * Address-based channel binding (email today; SMS/WhatsApp later).
 * Chat bindings stay on ChannelEndpoint. Each channel has at most one pending
 * and one verified slot, so a promote is a single write. `declared` is separate
 * and is never promoted into `verified`.
 */
export interface HumanContactChannelAddresses {
  pending?: HumanContactPendingAddress;
  verified?: HumanContactVerifiedAddress;
  declared?: HumanContactDeclaredAddress;
}

/**
 * How one human (subscriber) wants a relay agent to reach them. Chat bindings
 * stay on ChannelEndpoint; address-based channels (email) live in `addresses`
 * after double opt-in. This row is never exposed on the public subscriber API.
 */
export class HumanContactEntity {
  _id: string;

  /** Agent that delivers to this human (the `human_relay` system agent for the CLI). */
  _agentId: string;

  subscriberId: string;

  /** Channel used when an interaction doesn't pass `via`. Ignored while that channel isn't connected. */
  defaultVia?: HumanChannelViaEnum;

  defaultSetBy?: HumanContactDefaultSetBy;

  /**
   * Address-based channel verification state, keyed by channel. Contact-id
   * delivery to email requires `addresses.email.verified` — `Subscriber.email`
   * is copied from that slot only after promote. A typed address on one send
   * from a non-keyless org is the exception and does not promote this slot.
   */
  addresses?: Partial<Record<HumanChannelViaEnum, HumanContactChannelAddresses>>;

  /** The account owner's own contact. A relay agent has at most one. */
  isOperator?: boolean;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type HumanContactDBModel = ChangePropsValueType<
  HumanContactEntity,
  '_environmentId' | '_organizationId' | '_agentId'
>;
