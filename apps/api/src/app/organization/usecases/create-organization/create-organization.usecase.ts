import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { OrganizationEntity, OrganizationRepository, UserRepository } from '@novu/dal';
import { ApiServiceLevelEnum, EnvironmentEnum, JobTitleEnum, MemberRoleEnum } from '@novu/shared';

import { CreateEnvironmentCommand } from '../../../environments-v1/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../../environments-v1/usecases/create-environment/create-environment.usecase';
import { CreateNovuIntegrationsCommand } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { CreateNovuIntegrations } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { UpsertLayout, UpsertLayoutCommand } from '../../../layouts-v2/usecases/upsert-layout';
import { EMPTY_LAYOUT } from '../../../layouts-v2/utils/layout-templates';
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
    private readonly createEnvironmentUsecase: CreateEnvironment,
    private readonly createNovuIntegrations: CreateNovuIntegrations,
    private readonly upsertLayoutUsecase: UpsertLayout,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<OrganizationEntity> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new BadRequestException('User not found');

    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const defaultApiServiceLevel =
      isSelfHosted && isEnterprise ? ApiServiceLevelEnum.UNLIMITED : ApiServiceLevelEnum.FREE;

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
        name: EnvironmentEnum.DEVELOPMENT,
        organizationId: createdOrganization._id,
        system: true,
      })
    );

    await this.createNovuIntegrations.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: devEnv._id,
        organizationId: devEnv._organizationId,
        userId: user._id,
        name: devEnv.name,
      })
    );

    try {
      await this.upsertLayoutUsecase.execute(
        UpsertLayoutCommand.create({
          environmentId: devEnv._id,
          organizationId: devEnv._organizationId,
          userId: user._id,
          layoutDto: {
            name: 'Default layout',
            controlValues: {
              email: {
                body: JSON.stringify(EMPTY_LAYOUT),
                editorType: 'block',
              },
            },
          },
        })
      );
    } catch {}

    const prodEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: EnvironmentEnum.PRODUCTION,
        organizationId: createdOrganization._id,
        parentEnvironmentId: devEnv._id,
        system: true,
      })
    );

    try {
      await this.upsertLayoutUsecase.execute(
        UpsertLayoutCommand.create({
          environmentId: prodEnv._id,
          organizationId: prodEnv._organizationId,
          userId: user._id,
          layoutDto: {
            name: 'Default layout',
            controlValues: {
              email: {
                body: JSON.stringify(EMPTY_LAYOUT),
                editorType: 'block',
              },
            },
          },
        })
      );
    } catch {}

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
