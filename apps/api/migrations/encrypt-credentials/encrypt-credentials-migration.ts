import { NestFactory } from '@nestjs/core';
import { encryptSecret, PinoLogger } from '@novu/application-generic';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ICredentialsDto, secureCredentials } from '@novu/shared';
import { AppModule } from '../../src/app.module';

export async function encryptOldCredentialsMigration() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('EncryptCredentialsMigration');

  logger.info('start migration - encrypt credentials');

  const integrationRepository = new IntegrationRepository();
  const integrations = await integrationRepository.find({} as any);

  for (const integration of integrations) {
    logger.info(`integration ${integration._id}`);

    const updatePayload: Partial<IntegrationEntity> = {};

    if (!integration.credentials) {
      logger.info(`integration ${integration._id} - is not contains credentials, skipping..`);
      continue;
    }

    updatePayload.credentials = encryptCredentialsWithGuard(integration);

    await integrationRepository.update(
      { _id: integration._id, _environmentId: integration._environmentId },
      {
        $set: updatePayload,
      }
    );
    logger.info(`integration ${integration._id} - credentials updated`);
  }
  logger.info('end migration');
}

export function encryptCredentialsWithGuard(integration: IntegrationEntity): ICredentialsDto {
  const encryptedCredentials: ICredentialsDto = {};
  const { credentials } = integration;

  for (const key in credentials) {
    const credential = credentials[key];

    if (needEncryption(key, credential, integration)) {
      encryptedCredentials[key] = encryptSecret(credential);
    } else {
      encryptedCredentials[key] = credential;
    }
  }

  return encryptedCredentials;
}

function needEncryption(key: string, credential: string, integration: IntegrationEntity) {
  return secureKey(key) && !alreadyEncrypted(credential, integration, key);
}

function secureKey(key: string): boolean {
  return secureCredentials.some((secureCred) => secureCred === key);
}

function alreadyEncrypted(credential: string, integration: IntegrationEntity, credentialKey: string): boolean {
  const encrypted = credential.includes('nvsk.');

  if (encrypted) {
    logger.info(`integration ${integration._id} - credential ${credentialKey} is already updated`);
  }

  return encrypted;
}
