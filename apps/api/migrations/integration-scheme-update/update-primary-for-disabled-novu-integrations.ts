// Aug 29th, 2023

/* eslint-disable no-console */
import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { IntegrationRepository, EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

import { AppModule } from '../../src/app.module';

export async function run() {
  console.log('Update the primary and priority fields for inactive Novu integrations\n');

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
      `Updating integrations for the "${organization.name}" organization in the ${environment.name} environment`
    );

    const integrations = await integrationRepository.find(
      {
        _organizationId: organization._id,
        _environmentId: environment._id,
        active: false,
        primary: true,
        providerId: {
          $in: [EmailProviderIdEnum.Novu, SmsProviderIdEnum.Novu],
        },
      },
      undefined,
      { sort: { createdAt: -1 } }
    );

    console.log(
      `Found ${integrations.length} inactive and primary Novu integrations ` +
        `for the "${organization.name}" organization in the ${environment.name} environment`
    );

    const ids = integrations.map((integration) => integration._id);
    if (ids.length > 0) {
      console.log(`Updating Novu integrations with: `, { primary: false, priority: 0 });

      await integrationRepository._model.updateMany(
        {
          _id: { $in: ids },
        },
        { $set: { primary: false, priority: 0 } }
      );
    }

    console.log(
      `Finished updating integrations for the "${organization.name}" organization in the ${environment.name} environment`
    );
    console.log('------------------------------------------\n');
  }

  app.close();
  process.exit(0);
}

run();
