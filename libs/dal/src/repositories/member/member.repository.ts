import { IMemberInvite, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { MemberEntity } from './member.entity';
import { BaseRepository } from '../base-repository';
import { Member } from './member.schema';

export interface IAddMemberData {
  _userId?: string;
  roles: MemberRoleEnum[];
  invite?: IMemberInvite;
  memberStatus: MemberStatusEnum;
}

export class MemberRepository extends BaseRepository<MemberEntity> {
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
    const members = await Member.find({
      _organizationId: organizationId,
    }).populate('_userId', 'firstName lastName email _id profilePicture createdAt');
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
    const member = await Member.findOne({
      _organizationId: organizationId,
      roles: MemberRoleEnum.ADMIN,
    });

    return member;
  }

  async getOrganizationAdmins(organizationId: string) {
    const members = await Member.find({
      _organizationId: organizationId,
    }).populate('_userId', 'firstName lastName email _id');
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
    return await this.find({
      _userId: userId,
      memberStatus: MemberStatusEnum.ACTIVE,
    });
  }

  async convertInvitedUserToMember(
    token: string,
    data: {
      memberStatus: MemberStatusEnum;
      _userId: string;
      answerDate: Date;
    }
  ) {
    await this.update(
      {
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
    return await this.findOne({
      'invite.token': token,
    });
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
