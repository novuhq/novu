import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { MemberRepository, OrganizationRepository, UserRepository } from '@notifire/dal';
import { SwitchOrganizationCommand } from './switch-organization.command';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class SwitchOrganization {
  constructor(
    private organizationRepository: OrganizationRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService
  ) {}

  async execute(command: SwitchOrganizationCommand): Promise<string> {
    const isAuthenticated = await this.authService.isAuthenticatedForOrganization(
      command.userId,
      command.newOrganizationId
    );
    if (!isAuthenticated) {
      throw new UnauthorizedException(`Not authorized for organization ${command.newOrganizationId}`);
    }

    const member = await this.memberRepository.findMemberByUserId(command.newOrganizationId, command.userId);
    const user = await this.userRepository.findById(command.userId);
    const token = await this.authService.getSignedToken(user, command.newOrganizationId, member);

    return token;
  }
}
