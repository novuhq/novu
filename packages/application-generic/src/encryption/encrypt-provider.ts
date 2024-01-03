import {
  EncryptedSecret,
  ICredentialsDto,
  NOVU_SUB_MASK,
  secureCredentials,
} from '@novu/shared';

import { decrypt, encrypt } from './cipher';

export function encryptSecret(text: string): EncryptedSecret {
  const encrypted = encrypt(text);

  return `${NOVU_SUB_MASK}${encrypted}`;
}

export function decryptSecret(text: string | EncryptedSecret): string {
  let encryptedSecret = text;

  if (novuEncrypted(text)) {
    encryptedSecret = text.slice(NOVU_SUB_MASK.length);
  }

  return decrypt(encryptedSecret);
}

export function encryptCredentials(
  credentials: ICredentialsDto
): ICredentialsDto {
  const encryptedCredentials: ICredentialsDto = {};

  for (const key in credentials) {
    encryptedCredentials[key] = needCredentialEncryption(key)
      ? encryptSecret(credentials[key])
      : credentials[key];
  }

  return encryptedCredentials;
}

export function decryptCredentials(
  credentials: ICredentialsDto
): ICredentialsDto {
  const decryptedCredentials: ICredentialsDto = {};

  for (const key in credentials) {
    decryptedCredentials[key] =
      typeof credentials[key] === 'string' && novuEncrypted(credentials[key])
        ? decryptSecret(credentials[key])
        : credentials[key];
  }

  return decryptedCredentials;
}

export function encryptApiKey(apiKey: string): EncryptedSecret {
  if (novuEncrypted(apiKey)) {
    return apiKey;
  }

  return encryptSecret(apiKey);
}

export function decryptApiKey(apiKey: string): string {
  if (novuEncrypted(apiKey)) {
    return decryptSecret(apiKey);
  }

  return apiKey;
}

function novuEncrypted(text: string): text is EncryptedSecret {
  return text.startsWith(NOVU_SUB_MASK);
}

function needCredentialEncryption(key: string): boolean {
  return secureCredentials.some((secureCred) => secureCred === key);
}
