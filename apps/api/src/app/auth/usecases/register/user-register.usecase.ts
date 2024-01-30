import { Inject, Injectable } from '@nestjs/common';
import { OrganizationEntity, UserRepository } from '@novu/dal';
import * as bcrypt from 'bcrypt';
import { SignUpOriginEnum } from '@novu/shared';
import { AnalyticsService, AuthService, createHash } from '@novu/application-generic';

import { UserRegisterCommand } from './user-register.command';
import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateOrganization } from '../../../organization/usecases/create-organization/create-organization.usecase';
import { CreateOrganizationCommand } from '../../../organization/usecases/create-organization/create-organization.command';

@Injectable()
export class UserRegister {
  constructor(
    private authService: AuthService,
    private userRepository: UserRepository,
    private createOrganizationUsecase: CreateOrganization,
    private analyticsService: AnalyticsService
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
      lastName: command.lastName?.toLowerCase(),
      password: passwordHash,
    });

    if (process.env.INTERCOM_IDENTITY_VERIFICATION_SECRET_KEY) {
      const intercomSecretKey = process.env.INTERCOM_IDENTITY_VERIFICATION_SECRET_KEY as string;
      const userHashForIntercom = createHash(intercomSecretKey, user._id);
      await this.userRepository.update(
        { _id: user._id },
        {
          $set: {
            'servicesHashes.intercom': userHashForIntercom,
          },
        }
      );
    }

    let organization: OrganizationEntity;
    if (command.organizationName) {
      organization = await this.createOrganizationUsecase.execute(
        CreateOrganizationCommand.create({
          name: command.organizationName,
          userId: user._id,
          jobTitle: command.jobTitle,
          domain: command.domain,
          productUseCases: command.productUseCases,
        })
      );
    }

    this.analyticsService.upsertUser(user, user._id);

    this.analyticsService.track('[Authentication] - Signup', user._id, {
      loginType: 'email',
      origin: command.origin || SignUpOriginEnum.WEB,
    });

    return {
      user: await this.userRepository.findById(user._id),
      token: await this.authService.generateUserToken(user),
    };
  }
}
