import { BadRequestException, Injectable } from '@nestjs/common';
import { MemberRepository } from '@novu/dal';
import { MemberStatusEnum } from '@novu/shared';
import { AddMemberCommand } from './add-member.command';

@Injectable()
export class AddMember {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(command: AddMemberCommand): Promise<void> {
    const isAlreadyMember = await this.isMember(command.organizationId, command.userId);
    if (isAlreadyMember) throw new BadRequestException('Member already exists');

    await this.memberRepository.addMember(command.organizationId, {
      _userId: command.userId,
      roles: command.roles,
      memberStatus: MemberStatusEnum.ACTIVE,
    });
  }

  private async isMember(organizationId: string, userId: string): Promise<boolean> {
    return !!(await this.memberRepository.findMemberByUserId(organizationId, userId));
  }
}
