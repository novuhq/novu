import type { Schedule, WorkflowPreferencesPartial } from '@novu/shared';
import { PreferencesTypeEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { SubscriberId } from '../subscriber';
import type { UserId } from '../user';

export type PreferencesDBModel = ChangePropsValueType<
  PreferencesEntity,
  '_environmentId' | '_organizationId' | '_subscriberId' | '_templateId' | '_userId' | '_topicSubscriptionId'
>;

export class PreferencesEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _subscriberId?: SubscriberId;

  _userId?: UserId;

  // workflowEntityId
  _templateId?: string;

  _topicSubscriptionId?: string;

  type: PreferencesTypeEnum;

  preferences: WorkflowPreferencesPartial;

  schedule?: Schedule;

  contextKeys?: string[];

  contextKeysHash?: string;

  createdAt?: string;

  updatedAt?: string;
}
