import { IUserEntity } from '../user';
import { MemberRoleEnum } from './member.enum';

export enum MemberStatusEnum {
  NEW = 'new',
  ACTIVE = 'active',
  INVITED = 'invited',
}

export interface IMemberInvite {
  email: string;
  token: string;
  invitationDate: Date;
  answerDate?: Date;
  _inviterId: string;
}

export interface IMemberEntity {
  _id: string;
  id: string;
  user?: IUserEntity | null;
  _userId: string | null;
  memberStatus: MemberStatusEnum;
  roles: MemberRoleEnum[];
  invite?: IMemberInvite;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
