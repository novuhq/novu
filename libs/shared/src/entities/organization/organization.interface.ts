import { IUserEntity } from '../user';
import { MemberRoleEnum } from './member.enum';
import { IMemberInvite, MemberStatusEnum } from './member.interface';

export interface IOrganizationEntity {
  _id: string;
  name: string;
  members: {
    _id: string;
    _userId?: string;
    user?: Pick<IUserEntity, 'firstName' | '_id' | 'lastName' | 'email'>;
    roles: MemberRoleEnum[];
    invite?: IMemberInvite;
    memberStatus: MemberStatusEnum;
  }[];
}
