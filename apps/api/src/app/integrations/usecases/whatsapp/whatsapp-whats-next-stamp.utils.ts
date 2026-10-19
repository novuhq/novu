import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';

interface WhatsNextStampParams {
  providerId: string;
  existingCredentials?: ICredentials;
  nextCredentials: ICredentials;
}

/**
 * True when a WhatsApp Business update should auto-stamp Layer-2 completion.
 * Stamps only on Access Token (`apiToken`) *rotation* after credentials already
 * exist - never on the initial Layer-1 save, webhook Verify Token (`token`)
 * edits, empty partial-form saves, or other credential field edits.
 */
export function shouldStampWhatsNextCompletedAt({
  providerId,
  existingCredentials,
  nextCredentials,
}: WhatsNextStampParams): boolean {
  if (providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
    return false;
  }

  if (existingCredentials?.whatsNextCompletedAt || nextCredentials.whatsNextCompletedAt) {
    return false;
  }

  const nextApiToken = typeof nextCredentials.apiToken === 'string' ? nextCredentials.apiToken.trim() : '';
  if (!nextApiToken) {
    return false;
  }

  const existingApiToken = typeof existingCredentials?.apiToken === 'string' ? existingCredentials.apiToken.trim() : '';

  // First-time Access Token save belongs to Layer-1 setup - do not complete Layer-2.
  if (!existingApiToken) {
    return false;
  }

  return nextApiToken !== existingApiToken;
}

/**
 * Returns credentials with `whatsNextCompletedAt` set when auto-stamp applies,
 * preserving a client-provided or already-stored stamp (idempotent).
 */
export function maybeStampWhatsNextCompletedAt({
  providerId,
  existingCredentials,
  nextCredentials,
}: WhatsNextStampParams): ICredentials {
  if (nextCredentials.whatsNextCompletedAt) {
    return nextCredentials;
  }

  if (existingCredentials?.whatsNextCompletedAt) {
    return {
      ...nextCredentials,
      whatsNextCompletedAt: existingCredentials.whatsNextCompletedAt,
    };
  }

  if (
    !shouldStampWhatsNextCompletedAt({
      providerId,
      existingCredentials,
      nextCredentials,
    })
  ) {
    return nextCredentials;
  }

  return {
    ...nextCredentials,
    whatsNextCompletedAt: new Date().toISOString(),
  };
}
