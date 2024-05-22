import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { GetTenantCommand } from './get-tenant.command';

@Injectable()
export class GetTenant {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: GetTenantCommand) {
    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.identifier,
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with identifier: ${command.identifier} does not exist under environment ${command.environmentId}`
      );
    }

    return tenant;
  }
}
