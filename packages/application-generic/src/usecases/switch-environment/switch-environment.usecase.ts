import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  EnvironmentRepository,
  MemberRepository,
  UserRepository,
} from '@novu/dal';
import { SwitchEnvironmentCommand } from './switch-environment.command';
import { AuthService } from '../../services/auth/auth.service';

@Injectable()
export class SwitchEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService
  ) {}

  async execute(command: SwitchEnvironmentCommand) {
    const project = await this.environmentRepository.findOne({
      _id: command.newEnvironmentId,
    });
    if (!project) throw new NotFoundException('Environment not found');
    if (project._organizationId !== command.organizationId) {
      throw new UnauthorizedException('Not authorized for organization');
    }

    const member = await this.memberRepository.findMemberByUserId(
      command.organizationId,
      command.userId
    );
    if (!member) throw new NotFoundException('Member is not found');

    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User is not found');

    const token = await this.authService.getSignedToken(
      user,
      command.organizationId,
      member,
      command.newEnvironmentId
    );

    return token;
  }
}
