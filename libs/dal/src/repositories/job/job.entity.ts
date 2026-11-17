import {
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
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
  status?: DeliveryLifecycleStatusEnum;
  detail?: DeliveryLifecycleDetail;
};

export class JobEntity {
  _id: string;
  identifier: string;
  // biome-ignore lint/suspicious/noExplicitAny: stored as Schema.Types.Mixed, the trigger payload is user-defined JSON
  payload: any;
  overrides?: TriggerOverrides;
  /**
   * Trigger-selected agent ObjectId. Omitted inherits the workflow agent; null opts out.
   */
  _agentId?: string | null;
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
  // biome-ignore lint/suspicious/noExplicitAny: stored as Schema.Types.Mixed, holds whatever the failing step threw
  error?: any;
  createdAt: string;
  updatedAt: string;
  _templateId: string;
  digest?: IWorkflowStepMetadata & {
    // biome-ignore lint/suspicious/noExplicitAny: digested trigger payloads (or payload refs), user-defined JSON
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
  /**
   * Resolved end of the current delay, digest window or snooze, set when the job is deferred.
   */
  waitUntil?: string;
}

export type JobDBModel = ChangePropsValueType<
  Omit<JobEntity, '_parentId' | '_actorId' | '_agentId'>,
  '_notificationId' | '_subscriberId' | '_environmentId' | '_organizationId' | '_userId'
> & {
  _parentId?: Types.ObjectId;

  _actorId?: Types.ObjectId;

  _agentId?: Types.ObjectId | null;
};
