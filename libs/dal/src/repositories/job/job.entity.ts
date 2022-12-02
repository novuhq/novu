import { StepTypeEnum, DigestUnitEnum, DigestTypeEnum, DelayTypeEnum, JobStatusEnum } from '@novu/shared';
import { NotificationStepEntity } from '../notification-template';

export { JobStatusEnum };
export class JobEntity {
  _id?: string;
  identifier: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides: Record<string, Record<string, unknown>>;
  step: NotificationStepEntity;
  transactionId: string;
  _notificationId: string;
  _subscriberId: string;
  _environmentId: string;
  _organizationId: string;
  providerId?: string;
  _userId: string;
  delay?: number;
  _parentId?: string;
  status: JobStatusEnum;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
  createdAt?: string;
  updatedAt?: string;
  _templateId: string;
  digest?: {
    events?: any[];
    amount?: number;
    unit?: DigestUnitEnum;
    digestKey?: string;
    type: DigestTypeEnum | DelayTypeEnum;
    backoffUnit?: DigestUnitEnum;
    backoffAmount?: number;
    updateMode?: boolean;
  };
  type?: StepTypeEnum;
  _actorId?: string;
}
