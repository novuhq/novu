/* eslint-disable */
import '../../src/config';

import { EnvironmentRepository, IApiKey } from '@novu/dal';
import { encryptSecret } from '@novu/application-generic';
import { EncryptedSecret } from '@novu/shared';
import { createHash } from 'crypto';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../src/app.module';
import { getLogger } from '../../src/app/shared/services/logger.service';

const logger = getLogger('EncryptApiKeysMigration');

export async function encryptApiKeysMigration() {
  logger.info('start migration - encrypt api keys');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const environmentRepository = app.get(EnvironmentRepository);
  const environments = await environmentRepository.find({});

  for (const environment of environments) {
    logger.info(`environment ${environment._id}`);

    if (!environment.apiKeys) {
      logger.info(`environment ${environment._id} - is not contains api keys, skipping..`);
      continue;
    }

    if (
      environment.apiKeys.every((key) => {
        isEncrypted(key.key);
      })
    ) {
      logger.info(`environment ${environment._id} - api keys are already encrypted, skipping..`);
      continue;
    }

    const updatePayload: IEncryptedApiKey[] = encryptApiKeysWithGuard(environment.apiKeys);

    await environmentRepository.update(
      { _id: environment._id },
      {
        $set: { apiKeys: updatePayload },
      }
    );

    logger.info(`environment ${environment._id} - api keys updated`);
  }

  logger.info('end migration');
}

export function encryptApiKeysWithGuard(apiKeys: IApiKey[]): IEncryptedApiKey[] {
  return apiKeys.map((apiKey: IApiKey) => {
    const hashedApiKey = createHash('sha256').update(apiKey.key).digest('hex');

    const encryptedApiKey: IEncryptedApiKey = {
      hash: apiKey?.hash ? apiKey?.hash : hashedApiKey,
      key: isEncrypted(apiKey.key) ? apiKey.key : encryptSecret(apiKey.key),
      _userId: apiKey._userId,
    };

    return encryptedApiKey;
  });
}

function isEncrypted(apiKey: string): apiKey is EncryptedSecret {
  return apiKey.startsWith('nvsk.');
}

export interface IEncryptedApiKey {
  key: EncryptedSecret;
  _userId: string;
  hash: string;
}
