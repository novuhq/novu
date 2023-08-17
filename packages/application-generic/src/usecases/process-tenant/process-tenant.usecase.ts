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

    const subscriberEntity = await this.getSubscriber(
      environmentId,
      organizationId,
      userId,
      tenant
    );

    if (subscriberEntity === null) {
      return undefined;
    }

    return subscriberEntity;
  }

  private async getSubscriber(
    environmentId: string,
    organizationId: string,
    userId: string,
    tenantPayload: ITenantDefine
  ): Promise<TenantEntity> {
    const tenant = await this.getTenantByIdentifier({
      _environmentId: environmentId,
      identifier: tenantPayload.identifier,
    });

    if (tenant && !this.tenantNeedUpdate(tenant, tenantPayload)) {
      return tenant;
    }

    if (tenant && this.tenantNeedUpdate(tenant, tenantPayload)) {
      return await this.updateTenantUsecase.execute(
        UpdateTenantCommand.create({
          environmentId,
          organizationId,
          userId,
          identifier: tenantPayload.identifier,
          name: tenantPayload.name,
          data: tenantPayload.data,
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
    tenantPayload
    // TODO: Getting rid of this null would be amazing
  ): Promise<TenantEntity> {
    return await this.createTenantUsecase.execute(
      CreateTenantCommand.create({
        environmentId,
        organizationId,
        userId,
        identifier: tenantPayload?.identifier,
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
