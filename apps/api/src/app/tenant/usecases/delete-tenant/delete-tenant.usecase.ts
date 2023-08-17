import { Injectable, NotFoundException } from '@nestjs/common';

import { TenantRepository, DalException } from '@novu/dal';

import { DeleteTenantCommand } from './delete-tenant.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetTenantCommand } from '../get-tenant/get-tenant.command';
import { GetTenant } from '../get-tenant/get-tenant.usecase';

@Injectable()
export class DeleteTenant {
  constructor(private tenantRepository: TenantRepository, private getTenantUsecase: GetTenant) {}

  async execute(command: DeleteTenantCommand) {
    const tenant = await this.getTenantUsecase.execute(
      GetTenantCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        identifier: command.identifier,
      })
    );

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
