import { ConflictException, Injectable } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { CreateTenantCommand } from './create-tenant.command';
import { AnalyticsService } from '@novu/application-generic';

@Injectable()
export class CreateTenant {
  constructor(private tenantRepository: TenantRepository, private analyticsService: AnalyticsService) {}

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

    this.analyticsService.track('Create Tenant - [Tenants]', command.userId, {
      _environmentId: command.environmentId,
      _organization: command.organizationId,
    });

    return await this.tenantRepository.create({
      _environmentId: command.environmentId,
      identifier: command.identifier,
      name: command.name,
      data: command.data,
    });
  }
}
