/* eslint-disable global-require */
import { BadRequestException, Injectable, Logger, Scope } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository, UserRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { ModuleRef } from '@nestjs/core';
import { CreateEnvironmentCommand } from '../../../../environments-v1/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../../../environments-v1/usecases/create-environment/create-environment.usecase';
import { GetOrganizationCommand } from '../../get-organization/get-organization.command';
import { GetOrganization } from '../../get-organization/get-organization.usecase';

import { ApiException } from '../../../../shared/exceptions/api.exception';
import { CreateNovuIntegrations } from '../../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { CreateNovuIntegrationsCommand } from '../../../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { SyncExternalOrganizationCommand } from './sync-external-organization.command';

// TODO: eventually move to @novu/ee-auth

/**
 * This logic is closely related to the CreateOrganization use case.
 * @see src/app/organization/usecases/create-organization/create-organization.usecase.ts
 *
 * The side effects of creating a new organization are largely
 * consistent with those in CreateOrganization, with only minor differences.
 */

@Injectable()
export class SyncExternalOrganization {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly getOrganizationUsecase: GetOrganization,
    private readonly userRepository: UserRepository,
    private readonly createEnvironmentUsecase: CreateEnvironment,
    private readonly createNovuIntegrations: CreateNovuIntegrations,
    private analyticsService: AnalyticsService,
    private moduleRef: ModuleRef
  ) {}

  async execute(command: SyncExternalOrganizationCommand): Promise<OrganizationEntity> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new ApiException('User not found');

    const organization = await this.organizationRepository.create({
      externalId: command.externalId,
    });

    const devEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: 'Development',
        organizationId: organization._id,
      })
    );

    await this.createNovuIntegrations.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: devEnv._id,
        organizationId: devEnv._organizationId,
        userId: user._id,
      })
    );

    const prodEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: 'Production',
        organizationId: organization._id,
        parentEnvironmentId: devEnv._id,
      })
    );

    await this.createNovuIntegrations.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: prodEnv._id,
        organizationId: prodEnv._organizationId,
        userId: user._id,
      })
    );

    this.analyticsService.upsertGroup(organization._id, organization, user);

    this.analyticsService.track('[Authentication] - Create Organization', user._id, {
      _organization: organization._id,
    });

    const organizationAfterChanges = await this.getOrganizationUsecase.execute(
      GetOrganizationCommand.create({
        id: organization._id,
        userId: command.userId,
      })
    );

    if (organizationAfterChanges !== null) {
      await this.startFreeTrial(user._id, organizationAfterChanges._id);
    }

    return organizationAfterChanges as OrganizationEntity;
  }

  private async startFreeTrial(userId: string, organizationId: string) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-billing')?.StartReverseFreeTrial) {
          throw new BadRequestException('Billing module is not loaded');
        }
        const usecase = this.moduleRef.get(require('@novu/ee-billing')?.StartReverseFreeTrial, {
          strict: false,
        });
        await usecase.execute({
          userId,
          organizationId,
        });
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'StartReverseFreeTrial');
    }
  }
}
