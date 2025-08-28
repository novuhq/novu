import { BadRequestException, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import { OrganizationEntity, OrganizationRepository, UserRepository } from '@novu/dal';
import { CreateEnvironmentCommand } from '../../../../environments-v1/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../../../environments-v1/usecases/create-environment/create-environment.usecase';
import { CreateNovuIntegrationsCommand } from '../../../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { CreateNovuIntegrations } from '../../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { UpsertLayout, UpsertLayoutCommand } from '../../../../layouts-v2/usecases/upsert-layout';
import { createDefaultLayout } from '../../../../layouts-v2/utils/layout-templates';
import { GetOrganizationCommand } from '../../get-organization/get-organization.command';
import { GetOrganization } from '../../get-organization/get-organization.usecase';
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
    private readonly upsertLayoutUsecase: UpsertLayout,
    private analyticsService: AnalyticsService,
    private moduleRef: ModuleRef,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: SyncExternalOrganizationCommand): Promise<OrganizationEntity> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new BadRequestException('User not found');
    if (!user._id) {
      this.logger.error({ err: 'User not found' }, 'User not found when syncing external organization');

      throw new BadRequestException('User not found');
    }

    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

    const organization = await this.organizationRepository.create({
      externalId: command.externalId,
      apiServiceLevel: isSelfHosted && isEnterprise ? 'unlimited' : undefined,
    });

    const devEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: 'Development',
        organizationId: organization._id,
        system: true,
      })
    );

    await this.createNovuIntegrations.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: devEnv._id,
        organizationId: devEnv._organizationId,
        userId: user._id,
        name: devEnv.name,
      })
    );

    await this.upsertLayoutUsecase.execute(
      UpsertLayoutCommand.create({
        environmentId: devEnv._id,
        organizationId: devEnv._organizationId,
        userId: user._id,
        layoutDto: {
          name: 'Default layout',
          controlValues: {
            email: {
              body: JSON.stringify(createDefaultLayout(organization.name)),
              editorType: 'block',
            },
          },
        },
      })
    );

    const prodEnv = await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        userId: user._id,
        name: 'Production',
        organizationId: organization._id,
        parentEnvironmentId: devEnv._id,
        system: true,
      })
    );

    await this.createNovuIntegrations.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: prodEnv._id,
        organizationId: prodEnv._organizationId,
        userId: user._id,
        name: prodEnv.name,
      })
    );

    await this.upsertLayoutUsecase.execute(
      UpsertLayoutCommand.create({
        environmentId: prodEnv._id,
        organizationId: prodEnv._organizationId,
        userId: user._id,
        layoutDto: {
          name: 'Default layout',
          controlValues: {
            email: {
              body: JSON.stringify(createDefaultLayout(organization.name)),
              editorType: 'block',
            },
          },
        },
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
      await this.createCustomer(user.email, organizationAfterChanges._id);
    }

    return organizationAfterChanges as OrganizationEntity;
  }

  private async createCustomer(billingEmail: string, organizationId: string) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-billing')?.GetOrCreateCustomer) {
          throw new BadRequestException('Billing module is not loaded');
        }
        const usecase = this.moduleRef.get(require('@novu/ee-billing')?.GetOrCreateCustomer, {
          strict: false,
        });
        await usecase.execute({
          organizationId,
          billingEmail,
        });
      }
    } catch (e) {
      this.logger.error({ err: e }, `Unexpected error while importing enterprise modules`);
    }
  }
}
