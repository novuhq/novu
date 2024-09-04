import { ChannelTypeEnum } from '@novu/shared';
import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';
import type { SubscriberId } from '../subscriber';
import { UserId } from '../user';
import { ChangePropsValueType } from '../../types';

type PreferenceOptions = {
  defaultValue: boolean;
  readOnly: boolean;
};

type WorkflowOptionsPreferences = {
  workflow: PreferenceOptions;
  channels: Record<ChannelTypeEnum, PreferenceOptions>;
};

export enum PreferencesActorEnum {
  USER = 'USER',
  SUBSCRIBER = 'SUBSCRIBER',
  WORKFLOW = 'WORKFLOW',
}

export type PreferencesDBModel = ChangePropsValueType<
  PreferencesEntity,
  '_environmentId' | '_organizationId' | '_subscriberId' | '_templateId' | '_userId'
>;

export class PreferencesEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _subscriberId?: SubscriberId;

  _userId?: UserId;

  _templateId?: string;

  actor: PreferencesActorEnum;

  preferences: WorkflowOptionsPreferences;
}
