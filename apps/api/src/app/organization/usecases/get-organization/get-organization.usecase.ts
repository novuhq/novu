import { Injectable, Scope } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import { GetOrganizationCommand } from './get-organization.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetOrganization {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async execute(command: GetOrganizationCommand) {
    return await this.organizationRepository.findById(command.id);
  }
}
