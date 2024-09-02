import { Inject } from '@nestjs/common';
import { MemberRoleEnum, IMemberInvite, MemberStatusEnum } from '@novu/shared';
import { IMemberRepository } from './member-repository.interface';
import { MemberEntity } from './member.entity';

export interface IAddMemberData {
  _userId?: string;
  roles: MemberRoleEnum[];
  invite?: IMemberInvite;
  memberStatus: MemberStatusEnum;
}

export class MemberRepository implements IMemberRepository {
  constructor(@Inject('MEMBER_REPOSITORY') private memberRepository: IMemberRepository) {}

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

  create(data: any, options?: any): Promise<MemberEntity> {
    return this.memberRepository.create(data, options);
  }

  update(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.memberRepository.update(query, body);
  }

  delete(query: any): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.memberRepository.delete(query);
  }

  count(query: any, limit?: number): Promise<number> {
    return this.memberRepository.count(query, limit);
  }

  aggregate(query: any[], options?: { readPreference?: 'secondaryPreferred' | 'primary' }): Promise<any> {
    return this.memberRepository.aggregate(query, options);
  }

  findOne(query: any, select?: any, options?: any): Promise<MemberEntity | null> {
    return this.memberRepository.findOne(query, select, options);
  }

  find(query: any, select?: any, options?: any): Promise<MemberEntity[]> {
    return this.memberRepository.find(query, select, options);
  }

  // eslint-disable-next-line require-yield
  async *findBatch(
    query: any,
    select?: string | undefined,
    options?: any,
    batchSize?: number | undefined
  ): AsyncGenerator<any, any, unknown> {
    return this.memberRepository.findBatch(query, select, options, batchSize);
  }

  insertMany(data: any, ordered: boolean): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: any }> {
    return this.memberRepository.insertMany(data, ordered);
  }

  updateOne(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.memberRepository.updateOne(query, body);
  }

  upsertMany(data: any): Promise<any> {
    return this.memberRepository.upsertMany(data);
  }

  bulkWrite(bulkOperations: any, ordered: boolean): Promise<any> {
    return this.memberRepository.bulkWrite(bulkOperations, ordered);
  }
}
