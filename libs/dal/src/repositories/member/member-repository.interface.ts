import { MemberRoleEnum, MemberStatusEnum, IMemberInvite } from '@novu/shared';
import { MemberEntity } from './member.entity';
import { IAddMemberData } from './member.repository';

export interface IMemberRepository {
  removeMemberById(
    organizationId: string,
    memberId: string
  ): Promise<{
    acknowledged: boolean;
    deletedCount: number;
  }>;

  updateMemberRoles(
    organizationId: string,
    memberId: string,
    roles: MemberRoleEnum[]
  ): Promise<{
    matched: number;
    modified: number;
  }>;

  getOrganizationMembers(organizationId: string): Promise<any[]>;

  getOrganizationAdminAccount(organizationId: string): Promise<MemberEntity | null>;

  getOrganizationAdmins(organizationId: string): Promise<
    {
      _userId: any;
      user: string;
      _id: string;
      roles: MemberRoleEnum[];
      invite?: IMemberInvite | undefined;
      memberStatus: MemberStatusEnum;
      _organizationId: string;
    }[]
  >;

  findUserActiveMembers(userId: string): Promise<MemberEntity[]>;

  convertInvitedUserToMember(
    organizationId: string,
    token: string,
    data: {
      memberStatus: MemberStatusEnum;
      _userId: string;
      answerDate: Date;
    }
  ): Promise<void>;

  findByInviteToken(token: string): Promise<MemberEntity | null>;

  findInviteeByEmail(organizationId: string, email: string): Promise<MemberEntity | null>;

  addMember(organizationId: string, member: IAddMemberData): Promise<void>;

  isMemberOfOrganization(organizationId: string, userId: string): Promise<boolean>;

  findMemberByUserId(organizationId: string, userId: string): Promise<MemberEntity | null>;

  findMemberById(organizationId: string, memberId: string): Promise<MemberEntity | null>;
}
