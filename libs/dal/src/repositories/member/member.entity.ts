import { IMemberInvite, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { Types } from 'mongoose';
import type { ChangePropsValueType } from '../../types/helpers';
import type { OrganizationId } from '../organization';
import { UserEntity } from '../user';

export class MemberEntity {
  _id: string;

  _userId: string;

  user?: Pick<UserEntity, 'firstName' | '_id' | 'lastName' | 'email'>;

  roles: MemberRoleEnum[];

  invite?: IMemberInvite;

  memberStatus: MemberStatusEnum;

  _organizationId: OrganizationId;
}

export type MemberDBModel = ChangePropsValueType<Omit<MemberEntity, 'invite'>, '_userId' | '_organizationId'> & {
  invite?: IMemberInvite & {
    _inviterId: Types.ObjectId;
  };
};
