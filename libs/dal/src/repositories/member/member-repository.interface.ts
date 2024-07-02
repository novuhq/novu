import { MemberRoleEnum, MemberStatusEnum, IMemberInvite } from '@novu/shared';
import { Types } from 'mongoose';
import { MemberEntity } from './member.entity';
import { IAddMemberData } from './member.repository';

export interface IMemberRepository extends IMemberRepositoryMongo {
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
  getOrganizationMembers(organizationId: string): Promise<MemberEntity[]>;
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

/**
 * MongoDB specific methods from base-repository.ts to achieve
 * common interface for EE and Community repositories
 */
export interface IMemberRepositoryMongo {
  create(data: any, options?: any): Promise<MemberEntity>;
  update(query: any, body: any): Promise<{ matched: number; modified: number }>;
  delete(query: any): Promise<{ acknowledged: boolean; deletedCount: number }>;
  count(query: any, limit?: number): Promise<number>;
  aggregate(query: any[], options?: { readPreference?: 'secondaryPreferred' | 'primary' }): Promise<any>;
  findOne(query: any, select?: any, options?: any): Promise<MemberEntity | null>;
  find(query: any, select?: any, options?: any): Promise<MemberEntity[]>;
  findBatch(query: any, select?: string, options?: any, batchSize?: number): AsyncGenerator<any>;
  insertMany(
    data: any,
    ordered: boolean
  ): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: Types.ObjectId[] }>;
  updateOne(query: any, body: any): Promise<{ matched: number; modified: number }>;
  upsertMany(data: any): Promise<any>;
  bulkWrite(bulkOperations: any, ordered: boolean): Promise<any>;
}
