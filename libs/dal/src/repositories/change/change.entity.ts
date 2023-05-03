import { Types } from 'mongoose';
import { ChangeEntityTypeEnum } from '@novu/shared';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { ChangePropsValueType } from '../../types/helpers';
import { UserEntity } from '../user';

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

export type ChangeDBModel = ChangePropsValueType<
  Omit<ChangeEntity, '_parentId'>,
  '_creatorId' | '_environmentId' | '_organizationId' | '_entityId'
> & {
  _parentId?: Types.ObjectId;
};
