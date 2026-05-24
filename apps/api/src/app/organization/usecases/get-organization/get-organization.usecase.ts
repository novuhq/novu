import { Injectable, Scope } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import {
  OrganizationPublicResponse,
  toOrganizationPublicResponse,
} from '../../mappers/organization-response.mapper';
import { GetOrganizationCommand } from './get-organization.command';

@Injectable()
export class GetOrganization {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async execute(command: GetOrganizationCommand): Promise<OrganizationPublicResponse | null | undefined> {
    const organization = await this.organizationRepository.findById(command.id);

    return toOrganizationPublicResponse(organization);
  }
}
