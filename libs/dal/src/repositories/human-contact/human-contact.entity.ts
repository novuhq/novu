import type { HumanChannelViaEnum } from '@novu/shared';
import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

/** Who picked the default channel. The person's own choice always wins over the inviter's. */
export type HumanContactDefaultSetBy = 'inviter' | 'contact';

/**
 * How one human (subscriber) wants a relay agent to reach them. Channel
 * bindings themselves stay on ChannelEndpoint (chat) and Subscriber.email;
 * this row only records the choices layered on top of them.
 */
export class HumanContactEntity {
  _id: string;

  /** Agent that delivers to this human (the `human_relay` system agent for the CLI). */
  _agentId: string;

  subscriberId: string;

  /** Channel used when an interaction doesn't pass `via`. Ignored while that channel isn't connected. */
  defaultVia?: HumanChannelViaEnum;

  defaultSetBy?: HumanContactDefaultSetBy;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type HumanContactDBModel = ChangePropsValueType<
  HumanContactEntity,
  '_environmentId' | '_organizationId' | '_agentId'
>;
