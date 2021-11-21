import { forwardRef, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApplicationRepository, MemberRepository, OrganizationRepository, UserRepository } from '@notifire/dal';
import { AuthService } from '../../services/auth.service';
import { SwitchApplicationCommand } from './switch-application.command';

@Injectable()
export class SwitchApplication {
  constructor(
    private applicationRepository: ApplicationRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService
  ) {}

  async execute(command: SwitchApplicationCommand) {
    const project = await this.applicationRepository.findById(command.newApplicationId);
    if (!project) throw new NotFoundException('Application not found');
    if (project._organizationId !== command.organizationId) {
      throw new UnauthorizedException('Not authorized for organization');
    }

    const member = await this.memberRepository.findMemberByUserId(command.organizationId, command.userId);
    const user = await this.userRepository.findById(command.userId);
    const token = await this.authService.getSignedToken(user, command.organizationId, member, command.newApplicationId);

    return token;
  }
}
