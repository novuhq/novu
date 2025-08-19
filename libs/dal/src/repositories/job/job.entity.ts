import {
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatus,
  ITenantDefine,
  IWorkflowStepMetadata,
  JobStatusEnum,
  StepTypeEnum,
  TriggerOverrides,
  WorkflowPreferences,
} from '@novu/shared';
import { Types } from 'mongoose';
import type { ChangePropsValueType } from '../../types';
import type { EnvironmentId } from '../environment';
import { NotificationStepEntity } from '../notification-template';
import type { OrganizationId } from '../organization';

export { JobStatusEnum };



export type DeliveryLifecycleState = {
  status?: DeliveryLifecycleStatus;
  detail?: DeliveryLifecycleDetail;
};

export class JobEntity {
  _id: string;
  identifier: string;
  payload: any;
  overrides: TriggerOverrides;
  step: NotificationStepEntity;
  tenant?: ITenantDefine;
  transactionId: string;
  _notificationId: string;
  subscriberId: string;
  _subscriberId: string;
  _mergedDigestId?: string | null;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  providerId?: string;
  _userId: string;
  delay?: number;
  _parentId?: string;
  status: JobStatusEnum;
  deliveryLifecycleState?: DeliveryLifecycleState;
  error?: any;
  createdAt: string;
  updatedAt: string;
  _templateId: string;
  digest?: IWorkflowStepMetadata & {
    events?: any[];
  };
  type?: StepTypeEnum;
  _actorId?: string;
  actorId?: string;
  stepOutput?: Record<string, unknown>;
  preferences?: WorkflowPreferences;
}

export type JobDBModel = ChangePropsValueType<
  Omit<JobEntity, '_parentId' | '_actorId'>,
  '_notificationId' | '_subscriberId' | '_environmentId' | '_organizationId' | '_userId'
> & {
  _parentId?: Types.ObjectId;

  _actorId?: Types.ObjectId;
};
