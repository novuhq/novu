import { forwardRef, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EnvironmentRepository, MemberRepository, OrganizationRepository, UserRepository } from '@novu/dal';
import { AuthService } from '../../services/auth.service';
import { SwitchEnvironmentCommand } from './switch-environment.command';

@Injectable()
export class SwitchEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService
  ) {}

  async execute(command: SwitchEnvironmentCommand) {
    const project = await this.environmentRepository.findById(command.newEnvironmentId);
    if (!project) throw new NotFoundException('Environment not found');
    if (project._organizationId !== command.organizationId) {
      throw new UnauthorizedException('Not authorized for organization');
    }

    const member = await this.memberRepository.findMemberByUserId(command.organizationId, command.userId);
    const user = await this.userRepository.findById(command.userId);
    const token = await this.authService.getSignedToken(user, command.organizationId, member, command.newEnvironmentId);

    return token;
  }
}
