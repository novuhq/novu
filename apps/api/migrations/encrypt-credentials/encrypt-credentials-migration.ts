import { IntegrationEntity } from '@novu/dal';
import { IntegrationRepository } from '@novu/dal';
import { ICredentialsDto, secureCredentials } from '@novu/shared';
import { encryptSecret } from '@novu/application-generic';

export async function encryptOldCredentialsMigration() {
  // eslint-disable-next-line no-console
  console.log('start migration - encrypt credentials');

  const integrationRepository = new IntegrationRepository();
  const integrations = await integrationRepository.find({} as any);

  for (const integration of integrations) {
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id}`);

    const updatePayload: Partial<IntegrationEntity> = {};

    if (!integration.credentials) {
      // eslint-disable-next-line no-console
      console.log(`integration ${integration._id} - is not contains credentials, skipping..`);
      continue;
    }

    updatePayload.credentials = encryptCredentialsWithGuard(integration);

    await integrationRepository.update(
      { _id: integration._id, _environmentId: integration._environmentId },
      {
        $set: updatePayload,
      }
    );
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id} - credentials updated`);
  }
  // eslint-disable-next-line no-console
  console.log('end migration');
}

export function encryptCredentialsWithGuard(integration: IntegrationEntity): ICredentialsDto {
  const encryptedCredentials: ICredentialsDto = {};
  const credentials = integration.credentials;

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
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id} - credential ${credentialKey} is already updated`);
  }

  return encrypted;
}
