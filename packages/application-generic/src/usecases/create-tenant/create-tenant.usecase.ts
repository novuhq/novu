import { ConflictException, Injectable } from '@nestjs/common';

import { TenantRepository } from '@novu/dal';
import { AnalyticsService } from '../../services/analytics.service';

import { CreateTenantCommand } from './create-tenant.command';

@Injectable()
export class CreateTenant {
  constructor(
    private tenantRepository: TenantRepository,
    private analyticsService: AnalyticsService
  ) {}

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

    const tenant = await this.tenantRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      identifier: command.identifier,
      name: command.name,
      data: command.data,
    });

    this.analyticsService.track('Create Tenant - [Tenants]', command.userId, {
      _environmentId: command.environmentId,
      _organization: command.organizationId,
    });

    return tenant;
  }
}
