import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CommunityOrganizationRepository, UserEntity, UserRepository } from '@novu/dal';
import { PinoLogger } from '@novu/application-generic';
import { ApiServiceLevelEnum } from '@novu/shared';
import { CreateOrganization } from '../../organization/usecases/create-organization/create-organization.usecase';
import { CreateOrganizationCommand } from '../../organization/usecases/create-organization/create-organization.command';
import { UserRegister } from '../usecases/register/user-register.usecase';
import { UserRegisterCommand } from '../usecases/register/user-register.command';
import { COMMUNITY_EDITION_NAME, getSelfHostedFindQuery } from '../../shared/helpers/self-hosted';

@Injectable()
export class CommunityEditionService implements OnModuleInit {
  private readonly E11000_DUPLICATE_KEY_ERROR_CODE = 'E11000';
  private readonly COMMUNITY_EDITION_USER_EMAIL = 'no-reply@example.com';

  constructor(
    @Inject('ORGANIZATION_REPOSITORY')
    private organizationRepository: CommunityOrganizationRepository,
    private createOrganizationUsecase: CreateOrganization,
    private userRegisterUsecase: UserRegister,
    private userRepository: UserRepository,
    private logger: PinoLogger
  ) {}

  async onModuleInit() {
    try {
      await this.initializeCommunityEditionOrganization();
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to initialize Self-Hosted Community Edition Setup during module init');
      throw error;
    }
  }

  private async initializeCommunityEditionOrganization(): Promise<void> {
    await this.organizationRepository.withTransaction(async () => {
      let communityEditionOrg = await this.organizationRepository.findOne(getSelfHostedFindQuery());

      if (communityEditionOrg) {
        this.logger.info(
          'Self Hosted is already initialized, skipping Community Edition creation. ' +
            `Organization already exists with ID: ${communityEditionOrg._id}`
        );

        return;
      }

      this.logger.info('Community Edition not found, creating it');

      try {
        let user = await this.userRepository.findByEmail(this.COMMUNITY_EDITION_USER_EMAIL);
        if (!user) {
          user = await this.createCommunityEditionUser();
        }

        this.logger.debug(`Retrieved Community User with ID: ${user._id}`);

        const organization = await this.createOrganizationUsecase.execute(
          CreateOrganizationCommand.create({
            userId: user._id,
            name: COMMUNITY_EDITION_NAME,
            apiServiceLevel: ApiServiceLevelEnum.UNLIMITED,
          })
        );

        this.logger.debug(`Retrieved Community Edition with ID: ${organization?._id}`);
      } catch (error) {
        const isDuplicateKeyError =
          error instanceof Error &&
          error.message.includes(this.E11000_DUPLICATE_KEY_ERROR_CODE) &&
          error.message.includes(COMMUNITY_EDITION_NAME);

        if (!isDuplicateKeyError) {
          throw error;
        }

        this.logger.warn('Duplicate key error, another instance may have created the Community Edition');
        communityEditionOrg = await this.organizationRepository.findOne(getSelfHostedFindQuery());
        if (!communityEditionOrg) {
          this.logger.error('Failed to retrieve Community Edition after duplicate key error');
          throw error;
        }

        this.logger.info(`Retrieved Community Edition created by another instance with ID: ${communityEditionOrg._id}`);
      }
    });
  }

  private async createCommunityEditionUser(): Promise<UserEntity> {
    try {
      const { user } = await this.userRegisterUsecase.execute(
        UserRegisterCommand.create({
          email: this.COMMUNITY_EDITION_USER_EMAIL,
          firstName: 'Community',
          lastName: 'User',
          password: 'communityUser1q@W#',
        })
      );

      if (!user?._id) {
        throw new Error('Failed to create community user');
      }

      return user;
    } catch (error) {
      const isDuplicateKeyDatabaseError =
        error instanceof Error &&
        error.message.includes(this.E11000_DUPLICATE_KEY_ERROR_CODE) &&
        error.message.includes(this.COMMUNITY_EDITION_USER_EMAIL);
      const isUserAlreadyExistsUsecaseError = error.message.includes('User already exists');

      if (!isDuplicateKeyDatabaseError && !isUserAlreadyExistsUsecaseError) {
        throw error;
      }

      this.logger.warn('Duplicate key error, another instance may have created the Community User');
      const user = await this.userRepository.findByEmail(this.COMMUNITY_EDITION_USER_EMAIL);
      if (!user) {
        this.logger.error('Failed to retrieve Community User after duplicate key error');
        throw error;
      }

      this.logger.info(`Retrieved Community User created by another instance with ID: ${user._id}`);

      if (!user?._id) {
        throw new Error('Failed to create Community user');
      }

      return user;
    }
  }
}
