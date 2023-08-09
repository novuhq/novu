// June 27th, 2023

import * as shortid from 'shortid';
import slugify from 'slugify';

import { providers } from '@novu/shared';
import { EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';

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
  const identifier = existingIdentifier ?? `${slugify(name, { lower: true, strict: true })}-${shortid.generate()}`;

  return { name, identifier };
}
