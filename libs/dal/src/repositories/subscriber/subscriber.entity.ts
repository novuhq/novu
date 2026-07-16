import { IChannelSettings, ISubscriber, PreferredHours, SubscriberCustomData } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import { ExternalSubscriberId } from './types';

export class SubscriberEntity implements ISubscriber {
  // TODO: Use SubscriberId. Means lot of changes across whole codebase. Cool down.
  _id: string;

  firstName: string;

  lastName: string;

  email: string;

  phone?: string;

  avatar?: string;

  locale?: string;

  subscriberId: ExternalSubscriberId;

  /**
   * @deprecated: use channelEndpoint instead
   */
  channels?: IChannelSettings[];

  topics?: string[];

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  deleted: boolean;

  createdAt: string;

  updatedAt: string;

  __v?: number;

  isOnline?: boolean;

  lastOnlineAt?: string;

  data?: SubscriberCustomData;

  timezone?: string;

  /**
   * Daily preferred contact hours. Unset/null means no restriction.
   */
  preferredHours?: PreferredHours | null;
}

export type SubscriberDBModel = ChangePropsValueType<SubscriberEntity, '_environmentId' | '_organizationId'>;
