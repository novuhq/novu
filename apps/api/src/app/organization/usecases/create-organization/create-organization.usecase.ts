import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository, UserEntity, UserRepository } from '@novu/dal';
import { MemberRoleEnum } from '@novu/shared';
import { CreateEnvironmentCommand } from '../../../environments/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../../environments/usecases/create-environment/create-environment.usecase';
import { capitalize } from '../../../shared/services/helper/helper.service';
import { MailService } from '../../../shared/services/mail/mail.service';
import { QueueService } from '../../../shared/services/queue';
import { GetOrganizationCommand } from '../get-organization/get-organization.command';
import { GetOrganization } from '../get-organization/get-organization.usecase';
import { AddMemberCommand } from '../membership/add-member/add-member.command';
import { AddMember } from '../membership/add-member/add-member.usecase';
import { CreateOrganizationCommand } from './create-organization.command';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';

@Injectable({
  scope: Scope.REQUEST,
})
export class CreateOrganization {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly addMemberUsecase: AddMember,
    private readonly getOrganizationUsecase: GetOrganization,
    private readonly queueService: QueueService,
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    private readonly createEnvironmentUsecase: CreateEnvironment,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<OrganizationEntity> {
    const organization = new OrganizationEntity();

    organization.logo = command.logo;
    organization.name = command.name;

    const user = await this.userRepository.findById(command.userId);

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

    this.analyticsService.upsertGroup(organization._id, organization);

    const organizationAfterChanges = await this.getOrganizationUsecase.execute(
      GetOrganizationCommand.create({
        id: createdOrganization._id,
        userId: command.userId,
      })
    );

    return organizationAfterChanges;
  }

  private async sendWelcomeEmail(user: UserEntity, organization: OrganizationEntity) {
    try {
      await this.mailService.sendMail({
        templateId: '35339302-a24e-4dc2-bff5-02f32b8537cc',
        to: user.email,
        from: {
          email: 'hi@novu.co',
          name: 'Novu',
        },
        params: {
          firstName: capitalize(user.firstName),
          organizationName: capitalize(organization.name),
        },
      });
    } catch (e) {
      Logger.error(e.message);
    }
  }
}
