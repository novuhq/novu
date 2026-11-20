import { CredentialsKeyEnum } from '../types';

export const TWILIO_AUTH_METHODS = ['apiKey'] as const;

export type TwilioAuthMethod = (typeof TWILIO_AUTH_METHODS)[number];

/** Credentials of the Twilio authentication method that is not selected. */
export function getUnusedTwilioAuthCredentialKeys(authMethod: string | undefined): CredentialsKeyEnum[] {
  return authMethod === 'apiKey'
    ? [CredentialsKeyEnum.Token]
    : [CredentialsKeyEnum.ApiKey, CredentialsKeyEnum.SecretKey];
}
