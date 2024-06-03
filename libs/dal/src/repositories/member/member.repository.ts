import { MemberRoleEnum, IMemberInvite, MemberStatusEnum } from '@novu/shared';
import { EnforceOrgId } from '../../types';
import { BaseRepository } from '../base-repository';
import { IMemberRepository } from './member-repository.interface';
import { MemberDBModel, MemberEntity } from './member.entity';
import { createMemberRepository } from './member.repository.factory';
import { Member } from './member.schema';

export interface IAddMemberData {
  _userId?: string;
  roles: MemberRoleEnum[];
  invite?: IMemberInvite;
  memberStatus: MemberStatusEnum;
}

export class MemberRepository
  extends BaseRepository<MemberDBModel, MemberEntity, EnforceOrgId>
  implements IMemberRepository
{
  private memberRepository: IMemberRepository;

  constructor() {
    super(Member, MemberEntity);
    this.memberRepository = createMemberRepository();
  }

  removeMemberById(organizationId: string, memberId: string): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.memberRepository.removeMemberById(organizationId, memberId);
  }

  updateMemberRoles(
    organizationId: string,
    memberId: string,
    roles: MemberRoleEnum[]
  ): Promise<{ matched: number; modified: number }> {
    return this.memberRepository.updateMemberRoles(organizationId, memberId, roles);
  }

  getOrganizationMembers(organizationId: string): Promise<any[]> {
    return this.memberRepository.getOrganizationMembers(organizationId);
  }

  getOrganizationAdminAccount(organizationId: string): Promise<MemberEntity | null> {
    return this.memberRepository.getOrganizationAdminAccount(organizationId);
  }

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
  > {
    return this.memberRepository.getOrganizationAdmins(organizationId);
  }

  findUserActiveMembers(userId: string): Promise<MemberEntity[]> {
    return this.memberRepository.findUserActiveMembers(userId);
  }

  convertInvitedUserToMember(
    organizationId: string,
    token: string,
    data: { memberStatus: MemberStatusEnum; _userId: string; answerDate: Date }
  ): Promise<void> {
    return this.memberRepository.convertInvitedUserToMember(organizationId, token, data);
  }

  findByInviteToken(token: string): Promise<MemberEntity | null> {
    return this.memberRepository.findByInviteToken(token);
  }

  findInviteeByEmail(organizationId: string, email: string): Promise<MemberEntity | null> {
    return this.memberRepository.findInviteeByEmail(organizationId, email);
  }

  addMember(organizationId: string, member: IAddMemberData): Promise<void> {
    return this.memberRepository.addMember(organizationId, member);
  }

  isMemberOfOrganization(organizationId: string, userId: string): Promise<boolean> {
    return this.memberRepository.isMemberOfOrganization(organizationId, userId);
  }

  findMemberByUserId(organizationId: string, userId: string): Promise<MemberEntity | null> {
    return this.memberRepository.findMemberByUserId(organizationId, userId);
  }

  findMemberById(organizationId: string, memberId: string): Promise<MemberEntity | null> {
    return this.memberRepository.findMemberById(organizationId, memberId);
  }
}
