import { IMemberInvite, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { MemberEntity } from './member.entity';
import { BaseRepository, Omit } from '../base-repository';
import { Member } from './member.schema';
import { Document, FilterQuery } from 'mongoose';

export interface IAddMemberData {
  _userId?: string;
  roles: MemberRoleEnum[];
  invite?: IMemberInvite;
  memberStatus: MemberStatusEnum;
}

class PartialIntegrationEntity extends Omit(MemberEntity, ['_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> & { _organizationId: string };

export class MemberRepository extends BaseRepository<EnforceEnvironmentQuery, MemberEntity> {
  constructor() {
    super(Member, MemberEntity);
  }

  async removeMemberById(organizationId: string, memberId: string) {
    return Member.remove({
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
    const requestQuery: EnforceEnvironmentQuery = {
      _organizationId: organizationId,
    };

    const members = await Member.find(requestQuery).populate(
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
    const requestQuery: EnforceEnvironmentQuery = {
      _organizationId: organizationId,
      roles: MemberRoleEnum.ADMIN,
    };

    const member = await Member.findOne(requestQuery);

    return member;
  }

  async getOrganizationAdmins(organizationId: string) {
    const requestQuery: EnforceEnvironmentQuery = {
      _organizationId: organizationId,
    };

    const members = await Member.find(requestQuery).populate('_userId', 'firstName lastName email _id');
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
    } as unknown as EnforceEnvironmentQuery;

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
    } as unknown as EnforceEnvironmentQuery;

    return await this.findOne(requestQuery);
  }

  async findInviteeByEmail(organizationId: string, email: string): Promise<MemberEntity> {
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
      '_id'
    ));
  }

  async findMemberByUserId(organizationId: string, userId: string): Promise<MemberEntity> {
    const member = await this.findOne({
      _organizationId: organizationId,
      _userId: userId,
    });

    if (!member) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.mapEntity(member) as any;
  }

  async findMemberById(organizationId: string, memberId: string): Promise<MemberEntity> {
    const member = await this.findOne({
      _organizationId: organizationId,
      _id: memberId,
    });

    if (!member) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.mapEntity(member) as any;
  }
}
