import { Inject, Injectable } from '@nestjs/common';
import { OrganizationEntity, UserRepository } from '@novu/dal';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../services/auth.service';
import { UserRegisterCommand } from './user-register.command';
import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateOrganization } from '../../../organization/usecases/create-organization/create-organization.usecase';
import { CreateOrganizationCommand } from '../../../organization/usecases/create-organization/create-organization.command';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
// eslint-disable-next-line max-len

@Injectable()
export class UserRegister {
  constructor(
    private authService: AuthService,
    private userRepository: UserRepository,
    private createOrganizationUsecase: CreateOrganization,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: UserRegisterCommand) {
    if (process.env.DISABLE_USER_REGISTRATION === 'true') throw new ApiException('Account creation is disabled');

    const email = normalizeEmail(command.email);
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) throw new ApiException('User already exists');

    const passwordHash = await bcrypt.hash(command.password, 10);
    const user = await this.userRepository.create({
      email,
      firstName: command.firstName.toLowerCase(),
      lastName: command.lastName.toLowerCase(),
      password: passwordHash,
    });

    let organization: OrganizationEntity;
    if (command.organizationName) {
      organization = await this.createOrganizationUsecase.execute(
        CreateOrganizationCommand.create({
          name: command.organizationName,
          userId: user._id,
        })
      );
    }

    this.analyticsService.upsertUser(user, user._id);

    return {
      user: await this.userRepository.findById(user._id),
      token: await this.authService.generateUserToken(user),
    };
  }
}
