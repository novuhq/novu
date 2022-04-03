import { Injectable, Logger, Scope } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository, UserEntity, UserRepository } from '@novu/dal';
import { MemberRoleEnum } from '@novu/shared';
import { capitalize } from '../../../shared/services/helper/helper.service';
import { MailService } from '../../../shared/services/mail/mail.service';
import { QueueService } from '../../../shared/services/queue';
import { GetOrganizationCommand } from '../get-organization/get-organization.command';
import { GetOrganization } from '../get-organization/get-organization.usecase';
import { AddMemberCommand } from '../membership/add-member/add-member.command';
import { AddMember } from '../membership/add-member/add-member.usecase';
import { CreateOrganizationCommand } from './create-organization.command';

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
    private readonly mailService: MailService
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

    /*
     * Comment because the design of the process needs to be rethought
     *
     * await this.sendWelcomeEmail(user, organization);
     */

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
