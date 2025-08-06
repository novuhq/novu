// June 27th, 2023

import { EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { providers, slugify } from '@novu/shared';
import shortid from 'shortid';

export const ENVIRONMENT_NAME_TO_SHORT_NAME = { Development: 'dev', Production: 'prod', undefined: '' };

export async function addIntegrationIdentifierMigrationBatched() {
  console.log('start migration - add integration identifier migration');

  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();
  const batchSize = 500;

  for await (const integration of integrationRepository.findBatch({} as any, '', {}, batchSize)) {
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
    console.log(`integration ${integration._id} - name & identifier updated`);
  }
  console.log('end migration');
}

export async function addIntegrationIdentifierMigration() {
  console.log('start migration - add integration identifier migration');

  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();

  const integrations = await integrationRepository.find({} as any);

  for (const integration of integrations) {
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
    console.log(`integration ${integration._id} - name & identifier updated`);
  }
  console.log('end migration');
}

async function getUpdatePayload(integration: IntegrationEntity, environmentRepo: EnvironmentRepository) {
  const updatePayload: Partial<IntegrationEntity> = {};
  const { name, identifier } = genIntegrationIdentificationDetails({ providerId: integration.providerId });

  if (!integration.name) {
    updatePayload.name = name;
  }

  if (!integration.identifier) {
    updatePayload.identifier = identifier;
  }

  return updatePayload;
}

export function genIntegrationIdentificationDetails({
  providerId,
  name: existingName,
  identifier: existingIdentifier,
}: {
  providerId: string;
  name?: string;
  identifier?: string;
}) {
  const providerIdCapitalized = `${providerId.charAt(0).toUpperCase()}${providerId.slice(1)}`;
  const defaultName = providers.find((provider) => provider.id === providerId)?.displayName ?? providerIdCapitalized;

  const name = existingName ?? defaultName;
  const identifier = existingIdentifier ?? `${slugify(name)}-${shortid.generate()}`;

  return { name, identifier };
}
