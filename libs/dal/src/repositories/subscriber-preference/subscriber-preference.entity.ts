import { Types } from 'mongoose';
import { IPreferenceChannels } from '@novu/shared';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class SubscriberPreferenceEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _subscriberId: string;

  _templateId: string;

  enabled: boolean;

  channels: IPreferenceChannels;
}

export type SubscriberPreferenceDBModel = Omit<
  SubscriberPreferenceEntity,
  '_environmentId' | '_organizationId' | '_subscriberId' | '_templateId' | '_parentId'
> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;

  _subscriberId: Types.ObjectId;

  _templateId: Types.ObjectId;
};
