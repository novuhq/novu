import { Types } from 'mongoose';
import { ChangeEntityTypeEnum } from '@novu/shared';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ChangeEntity {
  _id: string;

  _creatorId: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _entityId: string;

  enabled: boolean;

  type: ChangeEntityTypeEnum;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  change: any;

  createdAt: string;

  _parentId?: string;
}

export type ChangeDBModel = Omit<
  ChangeEntity,
  '_creatorId' | '_environmentId' | '_organizationId' | '_entityId' | '_parentId'
> & {
  _creatorId: Types.ObjectId;

  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;

  _entityId: Types.ObjectId;

  _parentId?: Types.ObjectId;
};
