import { EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { providers } from '@novu/shared';

export const ENVIRONMENT_NAME_TO_SHORT_NAME = { ['Development']: 'dev', ['Production']: 'prod', ['undefined']: '' };

export async function addIntegrationIdentifierMigrationBatched() {
  // eslint-disable-next-line no-console
  console.log('start migration - add integration identifier migration');

  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();
  const batchSize = 500;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const integration of integrationRepository.findBatch({} as any, '', {}, batchSize)) {
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id}`);

    const updatePayload = await getUpdatePayload(integration, environmentRepository);

    await integrationRepository.update(
      {
        _id: integration._id,
        _environmentId: integration._environmentId,
        _organizationId: integration._organizationId,
      },
      {
        $set: updatePayload,
      }
    );
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id} - name & identifier updated`);
  }
  // eslint-disable-next-line no-console
  console.log('end migration');
}

export async function addIntegrationIdentifierMigration() {
  // eslint-disable-next-line no-console
  console.log('start migration - add integration identifier migration');

  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const integrations = await integrationRepository.find({} as any);

  for (const integration of integrations) {
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id}`);

    const updatePayload = await getUpdatePayload(integration, environmentRepository);

    await integrationRepository.update(
      {
        _id: integration._id,
        _environmentId: integration._environmentId,
        _organizationId: integration._organizationId,
      },
      {
        $set: updatePayload,
      }
    );
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id} - name & identifier updated`);
  }
  // eslint-disable-next-line no-console
  console.log('end migration');
}

async function getUpdatePayload(integration: IntegrationEntity, environmentRepo: EnvironmentRepository) {
  const updatePayload: Partial<IntegrationEntity> = {};

  if (!integration.name) {
    updatePayload.name = getDisplayName(integration.providerId);
  }

  if (!integration.identifier) {
    updatePayload.identifier = await getIntegrationIdentifier(environmentRepo, integration);
  }

  return updatePayload;
}

export async function getIntegrationIdentifier(environmentRepo, integration) {
  const environment = await environmentRepo.findOne({ _id: integration._environmentId });
  const environmentName = ENVIRONMENT_NAME_TO_SHORT_NAME[environment?.name || 'undefined'];
  const environmentNameSuffix = environmentName ? `_${environmentName}` : '';

  return integration.providerId + environmentNameSuffix;
}

export function getDisplayName(providerId: string) {
  return providers.find((provider) => provider.id === providerId)?.displayName || providerId;
}
