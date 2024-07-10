import { FilterQuery } from 'mongoose';
import { IMemberInvite, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';

import { MemberEntity, MemberDBModel } from './member.entity';
import { BaseRepository } from '../base-repository';
import { Member } from './member.schema';
import type { EnforceOrgId } from '../../types/enforce';

export interface IAddMemberData {
  _userId?: string;
  roles: MemberRoleEnum[];
  invite?: IMemberInvite;
  memberStatus: MemberStatusEnum;
}

type MemberQuery = FilterQuery<MemberDBModel> & EnforceOrgId;

export class MemberRepository extends BaseRepository<MemberDBModel, MemberEntity, EnforceOrgId> {
  constructor() {
    super(Member, MemberEntity);
  }

  async removeMemberById(
    organizationId: string,
    memberId: string
  ): Promise<{
    /** Indicates whether this write result was acknowledged. If not, then all other members of this result will be undefined. */
    acknowledged: boolean;
    /** The number of documents that were deleted */
    deletedCount: number;
  }> {
    return this.MongooseModel.deleteOne({
      _id: memberId,
      _organizationId: organizationId,
    });
  }

  async updateMemberRoles(organizationId: string, memberId: string, roles: MemberRoleEnum[]) {
    return this.update(
      {
        _id: memberId,
        _organizationId: organizationId,
      },
      {
        roles,
      }
    );
  }

  async getOrganizationMembers(organizationId: string) {
    const requestQuery: MemberQuery = {
      _organizationId: organizationId,
    };

    const members = await this.MongooseModel.find(requestQuery).populate(
      '_userId',
      'firstName lastName email _id profilePicture createdAt'
    );
    if (!members) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersEntity: any = this.mapEntities(members);

    return [
      ...membersEntity.map((member) => {
        return {
          ...member,
          _userId: member._userId ? member._userId._id : null,
          user: member._userId,
        };
      }),
    ];
  }

  async getOrganizationAdminAccount(organizationId: string) {
    const requestQuery: MemberQuery = {
      _organizationId: organizationId,
      roles: MemberRoleEnum.ADMIN,
    };

    const member = await this.MongooseModel.findOne(requestQuery);

    return this.mapEntity(member);
  }

  async getOrganizationAdmins(organizationId: string) {
    const requestQuery: MemberQuery = {
      _organizationId: organizationId,
    };

    const members = await this.MongooseModel.find(requestQuery).populate('_userId', 'firstName lastName email _id');
    if (!members) return [];

    const membersEntity = this.mapEntities(members);

    return [
      ...membersEntity
        .filter((i) => i.roles.includes(MemberRoleEnum.ADMIN))
        .map((member) => {
          return {
            ...member,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            _userId: member._userId ? (member._userId as any)._id : null,
            user: member._userId,
          };
        }),
    ];
  }

  async findUserActiveMembers(userId: string): Promise<MemberEntity[]> {
    // exception casting - due to the login logic in generateUserToken
    const requestQuery = {
      _userId: userId,
      memberStatus: MemberStatusEnum.ACTIVE,
    } as unknown as MemberQuery;

    return await this.find(requestQuery);
  }

  async convertInvitedUserToMember(
    organizationId: string,
    token: string,
    data: {
      memberStatus: MemberStatusEnum;
      _userId: string;
      answerDate: Date;
    }
  ) {
    await this.update(
      {
        _organizationId: organizationId,
        'invite.token': token,
      },
      {
        memberStatus: data.memberStatus,
        _userId: data._userId,
        'invite.answerDate': data.answerDate,
      }
    );
  }

  async findByInviteToken(token: string) {
    const requestQuery = {
      'invite.token': token,
    } as unknown as MemberQuery;

    return await this.findOne(requestQuery);
  }

  async findInviteeByEmail(organizationId: string, email: string): Promise<MemberEntity | null> {
    const foundMember = await this.findOne({
      _organizationId: organizationId,
      'invite.email': email,
    });

    if (!foundMember) return null;

    return foundMember;
  }

  async addMember(organizationId: string, member: IAddMemberData): Promise<void> {
    await this.create({
      _userId: member._userId,
      roles: member.roles,
      invite: member.invite,
      memberStatus: member.memberStatus,
      _organizationId: organizationId,
    });
  }

  async isMemberOfOrganization(organizationId: string, userId: string): Promise<boolean> {
    return !!(await this.findOne(
      {
        _organizationId: organizationId,
        _userId: userId,
      },
      '_id',
      {
        readPreference: 'secondaryPreferred',
      }
    ));
  }

  async findMemberByUserId(organizationId: string, userId: string): Promise<MemberEntity | null> {
    const member = await this.findOne({
      _organizationId: organizationId,
      _userId: userId,
    });

    if (!member) return null;

    return this.mapEntity(member) as MemberEntity;
  }

  async findMemberById(organizationId: string, memberId: string): Promise<MemberEntity | null> {
    const member = await this.findOne({
      _organizationId: organizationId,
      _id: memberId,
    });

    if (!member) return null;

    return this.mapEntity(member) as MemberEntity;
  }
}
