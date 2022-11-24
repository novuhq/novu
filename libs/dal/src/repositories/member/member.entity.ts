import { IMemberInvite, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { UserEntity } from '../user';

export class MemberEntity {
  _id: string;

  _userId?: string;

  user?: Pick<UserEntity, 'firstName' | '_id' | 'lastName' | 'email'>;

  roles: MemberRoleEnum[];

  invite?: IMemberInvite;

  memberStatus: MemberStatusEnum;

  _organizationId: string;
}
