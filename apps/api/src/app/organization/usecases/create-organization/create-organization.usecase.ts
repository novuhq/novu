import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { EnvironmentRepository, OrganizationEntity, OrganizationRepository, UserRepository } from '@novu/dal';
import { ApiServiceLevelEnum, EnvironmentEnum, JobTitleEnum, MemberRoleEnum } from '@novu/shared';
import { getDefaultProjectConfig } from '../../../../config/default-project.config';
import { CreateEnvironmentCommand } from '../../../environments-v1/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../../environments-v1/usecases/create-environment/create-environment.usecase';
import { GetOrganizationCommand } from '../get-organization/get-organization.command';
import { GetOrganization } from '../get-organization/get-organization.usecase';
import { AddMemberCommand } from '../membership/add-member/add-member.command';
import { AddMember } from '../membership/add-member/add-member.usecase';
import { CreateOrganizationCommand } from './create-organization.command';

@Injectable()
export class CreateOrganization {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly addMemberUsecase: AddMember,
    private readonly getOrganizationUsecase: GetOrganization,
    private readonly userRepository: UserRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly createEnvironmentUsecase: CreateEnvironment,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<OrganizationEntity> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new BadRequestException('User not found');

    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const defaultApiServiceLevel =
      isSelfHosted && isEnterprise ? ApiServiceLevelEnum.UNLIMITED : ApiServiceLevelEnum.FREE;

    const defaultProject =
      isSelfHosted && (await this.organizationRepository.count({})) === 0 ? getDefaultProjectConfig() : undefined;

    if (defaultProject) {
      const existingEnvironment = await this.environmentRepository.findOne({ _id: defaultProject.id });
      if (existingEnvironment) {
        throw new BadRequestException('NOVU_DEFAULT_PROJECT_ID is already in use');
      }

      const apiKeyHash = createHash('sha256').update(defaultProject.apiKey).digest('hex');
      const existingApiKey = await this.environmentRepository.findByApiKey({ hash: apiKeyHash });
      if (existingApiKey) {
        throw new BadRequestException('NOVU_DEFAULT_API_KEY is already in use');
      }
    }

    const createdOrganization = await this.organizationRepository.create({
      logo: command.logo,
      name: command.name,
      apiServiceLevel: command.apiServiceLevel || defaultApiServiceLevel,
      domain: command.domain,
      language: command.language,
    });

    if (command.jobTitle) {
      await this.updateJobTitle(user, command.jobTitle);
    }

    await this.addMemberUsecase.execute(
      AddMemberCommand.create({
        roles: [MemberRoleEnum.OSS_ADMIN],
        organizationId: createdOrganization._id,
        userId: command.userId,
      })
    );

    const devEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: defaultProject?.name || EnvironmentEnum.DEVELOPMENT,
        organizationId: createdOrganization._id,
        system: true,
        color: defaultProject ? '#ff8547' : undefined,
        environmentId: defaultProject?.id,
        apiKey: defaultProject?.apiKey,
      })
    );

    await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: EnvironmentEnum.PRODUCTION,
        organizationId: createdOrganization._id,
        parentEnvironmentId: devEnv._id,
        system: true,
      })
    );

    this.analyticsService.upsertGroup(createdOrganization._id, createdOrganization, user);

    this.analyticsService.track('[Authentication] - Create Organization', user._id, {
      _organization: createdOrganization._id,
      language: command.language,
      creatorJobTitle: command.jobTitle,
    });

    const organizationAfterChanges = await this.getOrganizationUsecase.execute(
      GetOrganizationCommand.create({
        id: createdOrganization._id,
        userId: command.userId,
      })
    );

    return organizationAfterChanges as OrganizationEntity;
  }

  private async updateJobTitle(user, jobTitle: JobTitleEnum) {
    await this.userRepository.update(
      {
        _id: user._id,
      },
      {
        $set: {
          jobTitle,
        },
      }
    );

    this.analyticsService.setValue(user._id, 'jobTitle', jobTitle);
  }
}
