import { BadRequestException, Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository, UserRepository } from '@novu/dal';
import { ApiServiceLevelEnum, JobTitleEnum, MemberRoleEnum } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';

import { CreateEnvironmentCommand } from '../../../environments/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../../environments/usecases/create-environment/create-environment.usecase';
import { GetOrganizationCommand } from '../get-organization/get-organization.command';
import { GetOrganization } from '../get-organization/get-organization.usecase';
import { AddMemberCommand } from '../membership/add-member/add-member.command';
import { AddMember } from '../membership/add-member/add-member.usecase';
import { CreateOrganizationCommand } from './create-organization.command';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateNovuIntegrations } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { CreateNovuIntegrationsCommand } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { ModuleRef } from '@nestjs/core';

@Injectable({
  scope: Scope.REQUEST,
})
export class CreateOrganization {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly addMemberUsecase: AddMember,
    private readonly getOrganizationUsecase: GetOrganization,
    private readonly userRepository: UserRepository,
    private readonly createEnvironmentUsecase: CreateEnvironment,
    private readonly createNovuIntegrations: CreateNovuIntegrations,
    private analyticsService: AnalyticsService,
    private moduleRef: ModuleRef
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<OrganizationEntity> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new ApiException('User not found');

    const createdOrganization = await this.organizationRepository.create({
      logo: command.logo,
      name: command.name,
      apiServiceLevel: ApiServiceLevelEnum.FREE,
      domain: command.domain,
      productUseCases: command.productUseCases,
    });

    if (command.jobTitle) {
      await this.updateJobTitle(user, command.jobTitle);
    }

    await this.addMemberUsecase.execute(
      AddMemberCommand.create({
        roles: [MemberRoleEnum.ADMIN],
        organizationId: createdOrganization._id,
        userId: command.userId,
      })
    );

    const devEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: 'Development',
        organizationId: createdOrganization._id,
      })
    );

    await this.createNovuIntegrations.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: devEnv._id,
        organizationId: devEnv._organizationId,
        userId: user._id,
      })
    );

    const prodEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: 'Production',
        organizationId: createdOrganization._id,
        parentEnvironmentId: devEnv._id,
      })
    );

    await this.createNovuIntegrations.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: prodEnv._id,
        organizationId: prodEnv._organizationId,
        userId: user._id,
      })
    );

    this.analyticsService.upsertGroup(createdOrganization._id, createdOrganization, user);

    this.analyticsService.track('[Authentication] - Create Organization', user._id, {
      _organization: createdOrganization._id,
    });

    const organizationAfterChanges = await this.getOrganizationUsecase.execute(
      GetOrganizationCommand.create({
        id: createdOrganization._id,
        userId: command.userId,
      })
    );

    if (organizationAfterChanges !== null) {
      await this.startFreeTrial(user._id, organizationAfterChanges._id);
    }

    return organizationAfterChanges as OrganizationEntity;
  }

  private async updateJobTitle(user, jobTitle: JobTitleEnum) {
    await this.userRepository.update(
      {
        _id: user._id,
      },
      {
        $set: {
          jobTitle: jobTitle,
        },
      }
    );

    this.analyticsService.setValue(user._id, 'jobTitle', jobTitle);
  }

  private async startFreeTrial(userId: string, organizationId: string) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-billing')?.StartReverseFreeTrial) {
          throw new BadRequestException('Billing module is not loaded');
        }
        const usecase = this.moduleRef.get(require('@novu/ee-billing')?.StartReverseFreeTrial, {
          strict: false,
        });
        await usecase.execute({
          userId,
          organizationId,
        });
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'StartReverseFreeTrial');
    }
  }
}
