import { decrypt, encrypt } from './cipher';
import { ICredentialsDto, secureCredentials } from '@novu/shared';

const novuSubMask = 'nvsk.';

export function encryptProviderSecret(text: string): string {
  const encrypted = encrypt(text);

  return novuSubMask + encrypted;
}

export function decryptProviderSecret(text: string): string {
  if (text.startsWith(novuSubMask)) {
    text = text.slice(novuSubMask.length);
  }

  return decrypt(text);
}

export function encryptCredentials(credentials: ICredentialsDto): ICredentialsDto {
  const encryptedCredentials: ICredentialsDto = {};

  Object.keys(credentials).forEach((key) => {
    if (secureCredentials.some((secureCred) => secureCred === key)) {
      encryptedCredentials[key] = encryptProviderSecret(credentials[key]);
    } else {
      encryptedCredentials[key] = credentials[key];
    }
  });

  return encryptedCredentials;
}

export function decryptCredentials(credentials: ICredentialsDto): ICredentialsDto {
  const decryptedCredentials: ICredentialsDto = {};

  Object.keys(credentials).forEach((key) => {
    if (credentials[key].startsWith(novuSubMask)) {
      decryptedCredentials[key] = decryptProviderSecret(credentials[key]);
    } else {
      decryptedCredentials[key] = credentials[key];
    }
  });

  return decryptedCredentials;
}
