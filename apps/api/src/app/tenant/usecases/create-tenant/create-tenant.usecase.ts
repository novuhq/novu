import { ConflictException, Injectable } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { CreateTenantCommand } from './create-tenant.command';

@Injectable()
export class CreateTenant {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: CreateTenantCommand) {
    const tenantExist = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.identifier,
    });

    if (tenantExist) {
      throw new ConflictException(
        `Tenant with identifier: ${command.identifier} already exists under environment ${command.environmentId}`
      );
    }

    return await this.tenantRepository.create({
      _environmentId: command.environmentId,
      identifier: command.identifier,
      name: command.name,
      data: command.data,
    });
  }
}
