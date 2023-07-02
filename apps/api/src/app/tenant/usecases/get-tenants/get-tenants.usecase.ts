import { Injectable } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { GetTenantsCommand } from './get-tenants.command';

@Injectable()
export class GetTenants {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: GetTenantsCommand) {
    const { data, totalCount } = await this.getTenants(command);

    return {
      page: command.page,
      totalCount,
      pageSize: command.limit,
      data,
    };
  }

  private async getTenants(command: GetTenantsCommand) {
    const totalCountPromise = this.tenantRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    const dataPromise = this.tenantRepository.find(
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

    const [data, totalCount] = await Promise.all([dataPromise, totalCountPromise]);

    return { data, totalCount };
  }
}
