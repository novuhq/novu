import { WorkflowChannelPreferences } from '@novu/shared';
import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';
import type { SubscriberId } from '../subscriber';
import { UserId } from '../user';
import { ChangePropsValueType } from '../../types';

export enum PreferencesTypeEnum {
  SUBSCRIBER_GLOBAL = 'SUBSCRIBER_GLOBAL',
  SUBSCRIBER_WORKFLOW = 'SUBSCRIBER_WORKFLOW',
  USER_WORKFLOW = 'USER_WORKFLOW',
  WORKFLOW_RESOURCE = 'WORKFLOW_RESOURCE',
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

  type: PreferencesTypeEnum;

  preferences: WorkflowChannelPreferences;
}
