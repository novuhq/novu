import { Injectable } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { GetTenantsCommand } from './get-tenants.command';

@Injectable()
export class GetTenants {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: GetTenantsCommand) {
    const totalCount = await this.tenantRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    const data = await this.tenantRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '',
      {
        limit: command.limit,
        skip: command.page * command.limit,
      }
    );

    return {
      page: command.page,
      totalCount,
      pageSize: command.limit,
      data,
    };
  }
}
