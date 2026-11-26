import { getUnusedTwilioAuthCredentialKeys, type ICredentials, SmsProviderIdEnum } from '@novu/shared';
import {
  mergeAgentInboxCredentialsForUpdate,
  sanitizeAgentInboxCredentialsForCreate,
} from './novu-agent/novu-agent-credentials.utils';
import { ensureWhatsAppManagedCredentials } from './whatsapp/whatsapp-credentials.utils';

/**
 * Some providers own credential fields a client may not set, change, or clear.
 * Create and update each go through one of these, so the two paths cannot
 * apply a different set of provider rules.
 */
export function applyManagedCredentialsOnCreate(
  providerId: string,
  credentials: ICredentials,
  /** The stored credentials of the integration a duplicate copies its secrets from, read on the server. */
  copiedFrom?: ICredentials
): ICredentials {
  const whatsApp = ensureWhatsAppManagedCredentials({
    providerId,
    nextCredentials: credentials,
    existingCredentials: getCopiedManagedMode(credentials, copiedFrom),
  });

  return dropUnusedTwilioAuthCredentials(providerId, sanitizeAgentInboxCredentialsForCreate(providerId, whatsApp));
}

export function applyManagedCredentialsOnUpdate(params: {
  providerId: string;
  credentials: ICredentials;
  existingCredentials: ICredentials | undefined;
  /** Only the server-side embedded-signup flow may put an integration on Novu's Meta app. */
  allowNovuManagedWhatsApp: boolean;
}): ICredentials {
  const whatsApp = ensureWhatsAppManagedCredentials({
    providerId: params.providerId,
    nextCredentials: params.credentials,
    existingCredentials: params.existingCredentials,
    allowManagedFlagChange: params.allowNovuManagedWhatsApp,
  });

  return dropUnusedTwilioAuthCredentials(
    params.providerId,
    mergeAgentInboxCredentialsForUpdate(params.providerId, whatsApp, params.existingCredentials)
  );
}

/**
 * A WhatsApp copy that uses its source's access token stays on the source's Meta app: Novu's, when the source was
 * connected by Embedded Signup. Only the mode comes along; the copy's other credentials are what the request sent.
 */
function getCopiedManagedMode(
  credentials: ICredentials,
  copiedFrom: ICredentials | undefined
): ICredentials | undefined {
  const usesSourceToken = !!copiedFrom?.apiToken && copiedFrom.apiToken === credentials.apiToken;
  if (!usesSourceToken || copiedFrom?.isNovuManaged === undefined) return undefined;

  return { isNovuManaged: copiedFrom.isNovuManaged };
}

/** A Twilio integration stores only the credentials of its selected authentication method. */
function dropUnusedTwilioAuthCredentials(providerId: string, credentials: ICredentials): ICredentials {
  if (providerId !== SmsProviderIdEnum.Twilio) {
    return credentials;
  }

  const unusedKeys: string[] = getUnusedTwilioAuthCredentialKeys(credentials.authMethod);

  return Object.fromEntries(Object.entries(credentials).filter(([key]) => !unusedKeys.includes(key)));
}
