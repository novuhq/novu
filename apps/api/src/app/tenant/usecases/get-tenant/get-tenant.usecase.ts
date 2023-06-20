import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { GetTenantCommand } from './get-tenant.command';

@Injectable()
export class GetTenant {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: GetTenantCommand) {
    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.id,
    });

    if (!tenant) {
      throw new BadRequestException(
        `Tenant with id: ${command.id} does not exist under environment ${command.environmentId}`
      );
    }

    return tenant;
  }
}
