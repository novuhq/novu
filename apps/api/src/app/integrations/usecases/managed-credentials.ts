import type { ICredentials } from '@novu/shared';
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
export function applyManagedCredentialsOnCreate(providerId: string, credentials: ICredentials): ICredentials {
  const whatsApp = ensureWhatsAppManagedCredentials({ providerId, nextCredentials: credentials });

  return sanitizeAgentInboxCredentialsForCreate(providerId, whatsApp);
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

  return mergeAgentInboxCredentialsForUpdate(params.providerId, whatsApp, params.existingCredentials);
}
