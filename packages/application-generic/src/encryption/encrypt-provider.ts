import { decrypt, encrypt } from './cipher';
import { ICredentialsDto, secureCredentials } from '@novu/shared';

const NOVU_SUB_MASK = 'nvsk.';

export function encryptProviderSecret(text: string): string {
  const encrypted = encrypt(text);

  return NOVU_SUB_MASK + encrypted;
}

export function decryptProviderSecret(text: string): string {
  let encryptedSecret = text;

  if (isEncryptedCredential(text)) {
    encryptedSecret = text.slice(NOVU_SUB_MASK.length);
  }

  return decrypt(encryptedSecret);
}

export function encryptCredentials(
  credentials: ICredentialsDto
): ICredentialsDto {
  const encryptedCredentials: ICredentialsDto = {};

  for (const key in credentials) {
    encryptedCredentials[key] = needEncryption(key)
      ? encryptProviderSecret(credentials[key])
      : credentials[key];
  }

  return encryptedCredentials;
}

export function decryptCredentials(
  credentials: ICredentialsDto
): ICredentialsDto {
  const decryptedCredentials: ICredentialsDto = {};

  for (const key in credentials) {
    decryptedCredentials[key] = isEncryptedCredential(credentials[key])
      ? decryptProviderSecret(credentials[key])
      : credentials[key];
  }

  return decryptedCredentials;
}

function isEncryptedCredential(text: string): boolean {
  return text.startsWith(NOVU_SUB_MASK);
}

function needEncryption(key: string): boolean {
  return secureCredentials.some((secureCred) => secureCred === key);
}
