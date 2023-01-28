import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import { UpdateOrganizationCommand } from './update-organization-command';

@Injectable()
export class UpdateOrganization {
  constructor(private organizationRepository: OrganizationRepository) {}

  async execute(command: UpdateOrganizationCommand) {
    const payload = {
      name: command.name,
    };

    await this.organizationRepository.updateOrganization(command.id, payload);

    return payload;
  }
}
