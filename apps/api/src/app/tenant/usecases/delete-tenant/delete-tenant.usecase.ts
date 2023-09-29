import { Injectable } from '@nestjs/common';

import { GetTenantCommand, GetTenant } from '@novu/application-generic';
import { TenantRepository, DalException } from '@novu/dal';

import { DeleteTenantCommand } from './delete-tenant.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

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
      await this.tenantRepository.delete({
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
