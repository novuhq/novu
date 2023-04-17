import { Inject, Injectable, Scope } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository, UserRepository } from '@novu/dal';
import { MemberRoleEnum } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';

import { CreateEnvironmentCommand } from '../../../environments/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../../environments/usecases/create-environment/create-environment.usecase';
import { GetOrganizationCommand } from '../get-organization/get-organization.command';
import { GetOrganization } from '../get-organization/get-organization.usecase';
import { AddMemberCommand } from '../membership/add-member/add-member.command';
import { AddMember } from '../membership/add-member/add-member.usecase';
import { CreateOrganizationCommand } from './create-organization.command';

import { ApiException } from '../../../shared/exceptions/api.exception';

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
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<OrganizationEntity> {
    const organization = new OrganizationEntity();

    organization.logo = command.logo;
    organization.name = command.name;

    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new ApiException('User not found');

    const createdOrganization = await this.organizationRepository.create(organization);

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

    await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: 'Production',
        organizationId: createdOrganization._id,
        parentEnvironmentId: devEnv._id,
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

    return organizationAfterChanges as OrganizationEntity;
  }
}
