import { Types } from 'mongoose';
import { IMemberInvite, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';

import { UserEntity } from '../user';
import type { OrganizationId } from '../organization';

export class MemberEntity {
  _id: string;

  _userId: string;

  user?: Pick<UserEntity, 'firstName' | '_id' | 'lastName' | 'email'>;

  roles: MemberRoleEnum[];

  invite?: IMemberInvite;

  memberStatus: MemberStatusEnum;

  _organizationId: OrganizationId;
}

export type MemberDBModel = Omit<MemberEntity, '_userId' | 'invite' | '_organizationId'> & {
  _userId: Types.ObjectId;

  invite?: IMemberInvite & {
    _inviterId: Types.ObjectId;
  };

  _organizationId: Types.ObjectId;
};
