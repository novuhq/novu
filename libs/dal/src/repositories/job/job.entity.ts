import {
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  ITenantDefine,
  IWorkflowStepMetadata,
  JobStatusEnum,
  StepTypeEnum,
  TriggerAgentOverride,
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
  status?: DeliveryLifecycleStatusEnum;
  detail?: DeliveryLifecycleDetail;
};

export class JobEntity {
  _id: string;
  identifier: string;
  payload: any;
  overrides: TriggerOverrides;
  agent?: TriggerAgentOverride;
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
  /**
   * True from claimNextChildAsQueued until AddJob confirms the queue message exists.
   * Lets stranded-chain recovery distinguish a child whose worker died before the
   * enqueue (releasable) from one whose message is live but backlogged (leave alone).
   */
  awaitingEnqueue?: boolean;
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
  contextKeys?: string[];
  /**
   * used to track the number of times a step has been extended to the next available time in the subscriber schedule
   */
  scheduleExtensionsCount?: number;
}

export type JobDBModel = ChangePropsValueType<
  Omit<JobEntity, '_parentId' | '_actorId'>,
  '_notificationId' | '_subscriberId' | '_environmentId' | '_organizationId' | '_userId'
> & {
  _parentId?: Types.ObjectId;

  _actorId?: Types.ObjectId;
};
