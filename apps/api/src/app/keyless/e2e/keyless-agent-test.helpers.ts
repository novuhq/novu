import { randomBytes } from 'node:crypto';
import { encryptApiKey } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { ChannelTypeEnum, EnvironmentEnum, EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import type { TestServer, UserSession } from '@novu/testing';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';

import { CreateNovuIntegrationsCommand } from '../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { CreateNovuIntegrations } from '../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { hashApiKey, KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX } from '../keyless-agent-environment';

const KEYLESS_ORGANIZATION_ENV_KEYS = [
  'KEYLESS_ORGANIZATION_ID',
  'KEYLESS_USER_EMAIL',
  FeatureFlagsKeysEnum.IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED,
  FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_ENVIRONMENTS_ENABLED,
];

/** Points the keyless configuration at `keylessOwner`'s org and enables both flags. Returns a restore function. */
export async function useKeylessOrganization(keylessOwner: UserSession): Promise<() => void> {
  const original = Object.fromEntries(KEYLESS_ORGANIZATION_ENV_KEYS.map((key) => [key, process.env[key]]));

  process.env.KEYLESS_ORGANIZATION_ID = keylessOwner.organization._id;
  process.env.KEYLESS_USER_EMAIL = keylessOwner.user.email;
  process.env[FeatureFlagsKeysEnum.IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED] = 'true';
  process.env[FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_ENVIRONMENTS_ENABLED] = 'true';

  return () => {
    for (const key of KEYLESS_ORGANIZATION_ENV_KEYS) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  };
}

/** Creates an agent keyless environment directly, without going through the create endpoint. */
export async function createAgentKeylessEnvironmentFixture(
  testServer: TestServer,
  input: { organizationId: string; userId: string; createdAt?: Date }
): Promise<{ environment: EnvironmentEntity; secretKey: string }> {
  const environmentRepository = new EnvironmentRepository();
  const secretKey = `sk_${randomBytes(32).toString('hex')}`;

  const created = await environmentRepository.create({
    _organizationId: input.organizationId,
    name: `${KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX}${new Date().toISOString()}`,
    identifier: nanoid(12),
    type: EnvironmentTypeEnum.DEV,
    apiKeys: [{ key: encryptApiKey(secretKey), _userId: input.userId, hash: hashApiKey(secretKey) }],
  });

  await testServer.getService(CreateNovuIntegrations).execute(
    CreateNovuIntegrationsCommand.create({
      environmentId: created._id,
      organizationId: created._organizationId,
      userId: input.userId,
      name: EnvironmentEnum.DEVELOPMENT,
      channels: [ChannelTypeEnum.IN_APP, ChannelTypeEnum.EMAIL],
      includeManagedClaude: false,
      environmentType: EnvironmentTypeEnum.DEV,
    })
  );

  if (input.createdAt) {
    // Mongoose timestamps make `createdAt` immutable, so bypass the model.
    await environmentRepository._model.collection.updateOne(
      { _id: new Types.ObjectId(created._id) },
      { $set: { createdAt: input.createdAt } }
    );
  }

  const environment = await environmentRepository.findOne({
    _id: created._id,
    _organizationId: created._organizationId,
  });

  if (!environment) {
    throw new Error(`Keyless agent environment fixture ${created._id} was not found after creation`);
  }

  return { environment, secretKey };
}
