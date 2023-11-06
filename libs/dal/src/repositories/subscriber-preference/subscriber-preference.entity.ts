import { IPreferenceChannels } from '@novu/shared';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { TransformEntityToDbModel } from '../../types/helpers';

export class SubscriberPreferenceEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _subscriberId: string;

  _templateId?: string;

  enabled: boolean;

  channels: IPreferenceChannels;

  level: PreferenceLevelEnum;
}

export type SubscriberPreferenceDBModel = TransformEntityToDbModel<SubscriberPreferenceEntity>;

export enum PreferenceLevelEnum {
  GLOBAL = 'global',
  TEMPLATE = 'template',
}
