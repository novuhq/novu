import '../../src/config';
import { NestFactory } from '@nestjs/core';
import { encryptCredentials } from '@novu/application-generic';
import { ChannelTypeEnum, EnvironmentRepository, IntegrationRepository, OrganizationRepository } from '@novu/dal';
import { InAppProviderIdEnum } from '@novu/shared';
import { AppModule } from '../../src/app.module';

const organizationRepository = new OrganizationRepository();
const environmentRepository = new EnvironmentRepository();
const integrationRepository = new IntegrationRepository();

export async function createInAppIntegration() {
  // Init the mongodb connection
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  console.log('start migration - in app integration');

  console.log('get organizations and its environments');

  const organizations = await organizationRepository.find({});
  const totalOrganizations = organizations.length;
  let currentOrganization = 0;
  for (const organization of organizations) {
    currentOrganization += 1;
    console.log(`organization ${currentOrganization} of ${totalOrganizations}`);

    const environments = await environmentRepository.findOrganizationEnvironments(organization._id);
    for (const environment of environments) {
      const count = await integrationRepository.count({
        _environmentId: environment._id,
        _organizationId: organization._id,
        providerId: InAppProviderIdEnum.Novu,
        channel: ChannelTypeEnum.IN_APP,
      });

      if (count === 0) {
        const response = await integrationRepository.create({
          _environmentId: environment._id,
          _organizationId: organization._id,
          providerId: InAppProviderIdEnum.Novu,
          channel: ChannelTypeEnum.IN_APP,
          credentials: encryptCredentials({
            hmac: environment.widget?.notificationCenterEncryption,
          }),
          active: true,
        });

        console.log(`Created Integration ${response._id}`);
      }

      console.log(`Prococessed environment ${environment._id}`);
    }

    console.log(`Prococessed organization ${organization._id}`);
  }

  console.log('end migration');
}

createInAppIntegration();
