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
 * Address-based channel binding (email today; SMS/WhatsApp later).
 * Chat bindings stay on ChannelEndpoint. Each channel has at most one pending
 * and one verified slot, so a promote is a single write.
 */
export interface HumanContactChannelAddresses {
  pending?: HumanContactPendingAddress;
  verified?: HumanContactVerifiedAddress;
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
   * Address-based channel verification state, keyed by channel. Delivery to
   * email requires `addresses.email.verified` — `Subscriber.email` is copied
   * from that slot only after promote.
   */
  addresses?: Partial<Record<HumanChannelViaEnum, HumanContactChannelAddresses>>;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type HumanContactDBModel = ChangePropsValueType<
  HumanContactEntity,
  '_environmentId' | '_organizationId' | '_agentId'
>;
