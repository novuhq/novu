import { Injectable, NotFoundException, Scope, BadRequestException } from '@nestjs/common';
import { IAddMemberData, MemberRepository, OrganizationRepository, UserRepository } from '@novu/dal';
import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';

import { InviteMemberCommand } from './invite-member.command';
import { capitalize, createGuid } from '../../../shared/services/helper/helper.service';

@Injectable({
  scope: Scope.REQUEST,
})
export class InviteMember {
  constructor(
    private organizationRepository: OrganizationRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: InviteMemberCommand) {}
}
