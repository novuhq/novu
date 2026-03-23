import { AiResourceTypeEnum, SnapshotSourceTypeEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class SnapshotEntity {
  _id: string;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;

  resourceType: AiResourceTypeEnum;
  resourceId?: string;

  sourceType: SnapshotSourceTypeEnum;
  sourceId: string;

  data: unknown | null;

  createdAt: string;
  updatedAt: string;
}

export type SnapshotDBModel = ChangePropsValueType<SnapshotEntity, '_environmentId' | '_organizationId'>;
