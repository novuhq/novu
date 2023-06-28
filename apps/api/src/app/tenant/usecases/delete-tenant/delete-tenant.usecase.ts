import { Injectable, NotFoundException } from '@nestjs/common';

import { TenantRepository, DalException } from '@novu/dal';

import { DeleteTenantCommand } from './delete-tenant.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class DeleteTenant {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: DeleteTenantCommand) {
    const tenant = await this.tenantRepository.findOne({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      identifier: command.identifier,
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with identifier: ${command.identifier} is not exists under environment ${command.environmentId}`
      );
    }

    try {
      return await this.tenantRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.identifier,
      });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }
  }
}
