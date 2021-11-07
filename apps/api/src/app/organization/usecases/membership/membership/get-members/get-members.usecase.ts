import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { OrganizationRepository, MemberRepository } from '@notifire/dal';
import { GetMembersCommand } from './get-members.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetMembers {
  constructor(private organizationRepository: OrganizationRepository, private membersRepository: MemberRepository) {}

  async execute(command: GetMembersCommand) {
    return await this.membersRepository.getOrganizationMembers(command.organizationId);
  }
}
