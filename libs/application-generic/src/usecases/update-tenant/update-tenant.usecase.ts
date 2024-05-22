import { ConflictException, Injectable } from '@nestjs/common';
import { TenantRepository, TenantEntity } from '@novu/dal';

import { UpdateTenantCommand } from './update-tenant.command';
import { GetTenantCommand, GetTenant } from '../get-tenant';

@Injectable()
export class UpdateTenant {
  constructor(
    private tenantRepository: TenantRepository,
    private getTenantUsecase: GetTenant
  ) {}

  async execute(command: UpdateTenantCommand): Promise<TenantEntity> {
    const tenant =
      command.tenant ??
      (await this.getTenantUsecase.execute(
        GetTenantCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          identifier: command.identifier,
        })
      ));

    const updatePayload: Partial<TenantEntity> = {};

    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.data) {
      updatePayload.data = command.data;
    }

    if (
      command?.newIdentifier &&
      command?.newIdentifier !== tenant?.identifier
    ) {
      await this.validateIdentifierDuplication({
        environmentId: command.environmentId,
        identifier: command.newIdentifier,
      });

      updatePayload.identifier = command.newIdentifier;
    }

    await this.tenantRepository.update(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.identifier,
        _id: tenant._id,
      },
      {
        $set: updatePayload,
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _id: tenant._id,
    }))!;
  }

  private async validateIdentifierDuplication({
    environmentId,
    identifier,
  }: {
    environmentId: string;
    identifier: string;
  }) {
    const tenantExist = await this.tenantRepository.findOne({
      _environmentId: environmentId,
      identifier: identifier,
    });

    if (tenantExist) {
      throw new ConflictException(
        `Tenant with identifier: ${identifier} already exists under environment ${environmentId}`
      );
    }
  }
}
