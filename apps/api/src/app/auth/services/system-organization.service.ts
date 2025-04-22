import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CommunityOrganizationRepository, MemberRepository, UserEntity, UserRepository } from '@novu/dal';
import { PinoLogger } from '@novu/application-generic';
import { ApiServiceLevelEnum } from '@novu/shared';
import { CreateOrganization } from '../../organization/usecases/create-organization/create-organization.usecase';
import { CreateOrganizationCommand } from '../../organization/usecases/create-organization/create-organization.command';
import { UserRegister } from '../usecases/register/user-register.usecase';
import { UserRegisterCommand } from '../usecases/register/user-register.command';
import { SwitchOrganization } from '../usecases/switch-organization/switch-organization.usecase';
import { SwitchOrganizationCommand } from '../usecases/switch-organization/switch-organization.command';

@Injectable()
export class SystemOrganizationService implements OnModuleInit {
  private readonly E11000_DUPLICATE_KEY_ERROR_CODE = 'E11000';
  private readonly SYSTEM_ORGANIZATION_NAME = 'System Organization';
  private readonly SYSTEM_USER_EMAIL = 'system@novu.co';

  constructor(
    private memberRepository: MemberRepository,
    @Inject('ORGANIZATION_REPOSITORY')
    private organizationRepository: CommunityOrganizationRepository,
    private createOrganizationUsecase: CreateOrganization,
    private userRegisterUsecase: UserRegister,
    private switchOrganizationUsecase: SwitchOrganization,
    private userRepository: UserRepository,
    private logger: PinoLogger
  ) {}

  async onModuleInit() {
    try {
      await this.initializeSystemOrganization();
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to initialize Self-Hosted System Setup during module init');
      throw error;
    }
  }

  private async initializeSystemOrganization(): Promise<void> {
    await this.organizationRepository.withTransaction(async () => {
      let systemOrg = await this.organizationRepository.findOne({ name: 'System Organization' });

      if (systemOrg) {
        this.logger.info(
          `Self Hosted is already initialized, skipping System Organization creation. Organization already exists with ID: ${systemOrg._id}`
        );

        return;
      }

      this.logger.info('System Organization not found, creating it');

      try {
        let user = await this.userRepository.findByEmail(this.SYSTEM_USER_EMAIL);
        if (!user) {
          user = await this.createSystemUser();
        }

        this.logger.debug(`Retrieved System User with ID: ${user._id}`);

        const organization = await this.createOrganizationUsecase.execute(
          CreateOrganizationCommand.create({
            userId: user._id,
            name: this.SYSTEM_ORGANIZATION_NAME,
            apiServiceLevel: ApiServiceLevelEnum.UNLIMITED,
          })
        );

        this.logger.debug(`Retrieved System Organization with ID: ${organization?._id}`);
      } catch (error) {
        const isDuplicateKeyError =
          error instanceof Error &&
          error.message.includes(this.E11000_DUPLICATE_KEY_ERROR_CODE) &&
          error.message.includes(this.SYSTEM_ORGANIZATION_NAME);

        if (!isDuplicateKeyError) {
          throw error;
        }

        this.logger.warn('Duplicate key error, another instance may have created the System Organization');
        systemOrg = await this.organizationRepository.findOne({ name: 'System Organization' });
        if (!systemOrg) {
          this.logger.error('Failed to retrieve System Organization after duplicate key error');
          throw error;
        }

        this.logger.info(`Retrieved System Organization created by another instance with ID: ${systemOrg._id}`);
      }
    });
  }

  private async createSystemUser(): Promise<UserEntity> {
    try {
      const { user } = await this.userRegisterUsecase.execute(
        UserRegisterCommand.create({
          email: this.SYSTEM_USER_EMAIL,
          firstName: 'System',
          lastName: 'User',
          password: 'systemUser1q@W#',
        })
      );

      if (!user?._id) {
        throw new Error('Failed to create system user');
      }

      return user;
    } catch (error) {
      const isDuplicateKeyDatabaseError =
        error instanceof Error &&
        error.message.includes(this.E11000_DUPLICATE_KEY_ERROR_CODE) &&
        error.message.includes(this.SYSTEM_USER_EMAIL);
      const isUserAlreadyExistsUsecaseError = error.message.includes('User already exists');

      if (!isDuplicateKeyDatabaseError && !isUserAlreadyExistsUsecaseError) {
        throw error;
      }

      this.logger.warn('Duplicate key error, another instance may have created the System User');
      const user = await this.userRepository.findByEmail(this.SYSTEM_USER_EMAIL);
      if (!user) {
        this.logger.error('Failed to retrieve System User after duplicate key error');
        throw error;
      }

      this.logger.info(`Retrieved System User created by another instance with ID: ${user._id}`);

      if (!user?._id) {
        throw new Error('Failed to create system user');
      }

      return user;
    }
  }

  async getSystemOrganizationToken() {
    const systemOrg = await this.organizationRepository.findOne({ name: 'System Organization' });

    if (!systemOrg) {
      throw new Error('System Organization not found');
    }

    const users = await this.memberRepository.getOrganizationMembers(systemOrg._id);

    if (!users || users.length === 0) {
      throw new Error('No admin users found for System Organization');
    }

    const token = await this.switchOrganizationUsecase.execute(
      SwitchOrganizationCommand.create({
        newOrganizationId: systemOrg._id!,
        userId: users[0]._userId,
      })
    );

    return { token };
  }
}
