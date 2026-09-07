import { AiResourceTypeEnum, AiResumeActionEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export type AiChatSnapshotRef = {
  _snapshotId: string;
  messageId: string;
  checkpointId?: string;
};

export class AiChatEntity {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _userId: string;

  resourceType: AiResourceTypeEnum;
  resourceId?: string;

  messages: unknown[];
  activeStreamId?: string | null;

  snapshots?: AiChatSnapshotRef[];
  resumeCheckpointId?: string;
  resumeAction?: AiResumeActionEnum | null;

  hasPendingChanges: boolean;

  createdAt: string;
  updatedAt: string;
}

export type AiChatDBModel = ChangePropsValueType<AiChatEntity, '_environmentId' | '_organizationId'>;
