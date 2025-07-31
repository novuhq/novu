import { ChangeEntityTypeEnum } from '@novu/shared';
import { Types } from 'mongoose';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import { UserEntity } from '../user';

export class ChangeEntity {
  _id: string;

  _creatorId: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _entityId: string;

  enabled: boolean;

  type: ChangeEntityTypeEnum;

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
