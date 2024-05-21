import { Injectable } from '@nestjs/common';
import { TenantRepository, TenantEntity } from '@novu/dal';
import { ITenantDefine } from '@novu/shared';
import { isEqual } from 'lodash';

import { InstrumentUsecase } from '../../instrumentation';
import { ProcessTenantCommand } from './process-tenant.command';
import { UpdateTenant, UpdateTenantCommand } from '../update-tenant';
import { CreateTenant, CreateTenantCommand } from '../create-tenant';

@Injectable()
export class ProcessTenant {
  constructor(
    private updateTenantUsecase: UpdateTenant,
    private createTenantUsecase: CreateTenant,
    private tenantRepository: TenantRepository
  ) {}

  @InstrumentUsecase()
  public async execute(
    command: ProcessTenantCommand
  ): Promise<TenantEntity | undefined> {
    const { environmentId, organizationId, userId, tenant } = command;

    let tenantEntity;

    try {
      tenantEntity = await this.getTenant(
        environmentId,
        organizationId,
        userId,
        tenant
      );
    } catch (e) {
      tenantEntity = null;
    }

    if (tenantEntity === null) {
      return undefined;
    }

    return tenantEntity;
  }

  private async getTenant(
    environmentId: string,
    organizationId: string,
    userId: string,
    tenantPayload: ITenantDefine
  ): Promise<TenantEntity> {
    const tenant = await this.getTenantByIdentifier({
      _environmentId: environmentId,
      identifier: tenantPayload.identifier,
    });

    if (tenant) {
      if (!this.tenantNeedUpdate(tenant, tenantPayload)) {
        return tenant;
      }

      return await this.updateTenantUsecase.execute(
        UpdateTenantCommand.create({
          environmentId,
          organizationId,
          userId,
          identifier: tenantPayload.identifier,
          name: tenantPayload?.name,
          data: tenantPayload?.data,
          tenant,
        })
      );
    }

    return await this.createTenant(
      environmentId,
      organizationId,
      userId,
      tenantPayload
    );
  }

  private async createTenant(
    environmentId: string,
    organizationId: string,
    userId: string,
    tenantPayload: ITenantDefine
  ): Promise<TenantEntity> {
    return await this.createTenantUsecase.execute(
      CreateTenantCommand.create({
        environmentId,
        organizationId,
        userId,
        identifier: tenantPayload.identifier,
        name: tenantPayload?.name,
        data: tenantPayload?.data,
      })
    );
  }

  private async getTenantByIdentifier({
    identifier,
    _environmentId,
  }: {
    identifier: string;
    _environmentId: string;
  }) {
    return await this.tenantRepository.findOne({
      _environmentId,
      identifier,
    });
  }

  private tenantNeedUpdate(
    tenant: TenantEntity,
    tenantPayload: Partial<TenantEntity>
  ): boolean {
    return (
      !!(tenantPayload?.name && tenant?.name !== tenantPayload?.name) ||
      !!(tenantPayload?.data && !isEqual(tenant?.data, tenantPayload?.data))
    );
  }
}
