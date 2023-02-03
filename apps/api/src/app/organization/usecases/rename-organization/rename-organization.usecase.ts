import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import { RenameOrganizationCommand } from './rename-organization-command';

@Injectable()
export class RenameOrganization {
  constructor(private organizationRepository: OrganizationRepository) {}

  async execute(command: RenameOrganizationCommand) {
    const payload = {
      name: command.name,
    };

    await this.organizationRepository.renameOrganization(command.id, payload);

    return payload;
  }
}
