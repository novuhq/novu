// July 29th, 2023

/* eslint-disable no-console */
import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { IntegrationRepository, EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY, ChannelTypeEnum } from '@novu/shared';

import { AppModule } from '../../src/app.module';

export async function run() {
  console.log('Migration for primary and priority fields in the integration entity\n');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const organizationRepository = app.get(OrganizationRepository);
  const environmentRepository = app.get(EnvironmentRepository);
  const integrationRepository = app.get(IntegrationRepository);

  const environments = await environmentRepository.find({});

  for (const environment of environments) {
    const organization = await organizationRepository.findById(environment._organizationId);
    if (!organization) {
      console.log(
        `Organization ${environment._organizationId} is not found for environment ${environment.name}, id: ${environment._id}`
      );
      continue;
    }

    console.log('\n------------------------------------------');
    console.log(
      `Migrating integrations for the "${organization.name}" organization in the ${environment.name} environment:`
    );

    for (const channel of CHANNELS_WITH_PRIMARY) {
      const integrations = await integrationRepository.find(
        {
          _organizationId: organization._id,
          _environmentId: environment._id,
          channel,
          active: true,
        },
        undefined,
        { sort: { createdAt: -1 } }
      );
      console.log('------');
      console.log(`Found ${integrations.length} active integrations for the ${channel} channel`);

      for (let i = 0; i < integrations.length; i++) {
        const integration = integrations[i];
        const payload = {
          primary: i === 0,
          priority: integrations.length - i,
        };
        console.log(`${i + 1}. Updating integration "${integration.name}" with: `, payload);
        await integrationRepository.update(
          {
            _id: integration._id,
            _environmentId: integration._environmentId,
            _organizationId: integration._organizationId,
          },
          {
            $set: payload,
          }
        );
      }

      const inactiveIntegrations = await integrationRepository.find({
        _organizationId: organization._id,
        _environmentId: environment._id,
        channel,
        active: false,
      });
      console.log('------');
      console.log(`Found ${inactiveIntegrations.length} inactive integrations for the ${channel} channel`);

      for (let i = 0; i < inactiveIntegrations.length; i++) {
        const integration = inactiveIntegrations[i];
        const payload = {
          primary: false,
          priority: 0,
        };
        console.log(`${i + 1}. Updating inactive integration "${integration.name}" with: `, payload);
        await integrationRepository.update(
          {
            _id: integration._id,
            _environmentId: integration._environmentId,
            _organizationId: integration._organizationId,
          },
          {
            $set: payload,
          }
        );
      }
    }

    for (const channel of [ChannelTypeEnum.IN_APP, ChannelTypeEnum.PUSH, ChannelTypeEnum.CHAT]) {
      const integrations = await integrationRepository.find({
        _organizationId: organization._id,
        _environmentId: environment._id,
        channel,
      });
      console.log('------');
      console.log(`Found ${integrations.length} integrations for the ${channel} channel`);

      for (let i = 0; i < integrations.length; i++) {
        const integration = integrations[i];
        const payload = {
          primary: false,
          priority: 0,
        };
        console.log(`${i + 1}. Updating integration "${integration.name}" with: `, payload);
        await integrationRepository.update(
          {
            _id: integration._id,
            _environmentId: integration._environmentId,
            _organizationId: integration._organizationId,
          },
          {
            $set: payload,
          }
        );
      }
    }

    console.log(
      `Finished migrating integrations for the "${organization.name}" organization in the ${environment.name} environment:`
    );
    console.log('------------------------------------------\n');
  }

  app.close();
  process.exit(0);
}

run();
