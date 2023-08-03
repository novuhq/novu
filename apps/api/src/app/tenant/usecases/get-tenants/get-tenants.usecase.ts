import { Injectable } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { GetTenantsCommand } from './get-tenants.command';

@Injectable()
export class GetTenants {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: GetTenantsCommand) {
    const data = await this.getTenants(command);

    return {
      page: command.page,
      hasMore: data?.length === command.limit,
      pageSize: command.limit,
      data,
    };
  }

  private async getTenants(command: GetTenantsCommand) {
    const data = await this.tenantRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '',
      {
        limit: command.limit,
        skip: command.page * command.limit,
        sort: { createdAt: -1 },
      }
    );

    return data;
  }
}
