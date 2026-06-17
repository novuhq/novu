import { randomUUID } from 'node:crypto';
import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';

export function resolveWhatsAppAppSecret(credentials: ICredentials): string | undefined {
  if (credentials.isNovuManaged === true) {
    const platformSecret = process.env.NOVU_WHATSAPP_APP_SECRET?.trim();

    return platformSecret || undefined;
  }

  const storedSecret = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

  return storedSecret || undefined;
}

export function resolveWhatsAppAppId(credentials: ICredentials): string | undefined {
  if (credentials.isNovuManaged === true) {
    const platformAppId = process.env.NOVU_WHATSAPP_APP_ID?.trim();

    return platformAppId || undefined;
  }

  return undefined;
}

export function isNovuManagedWhatsAppIntegration(credentials: ICredentials | undefined): boolean {
  return credentials?.isNovuManaged === true;
}

/**
 * For WhatsApp Business agent integrations Novu manages the webhook Verify
 * Token automatically: it's just a shared secret echoed back to Meta during
 * the webhook handshake, so making the user invent and paste one is friction
 * with no security benefit. We auto-fill it on the first save and leave it
 * untouched on subsequent updates so Meta's stored value keeps matching.
 */
export function ensureWhatsAppManagedCredentials({
  providerId,
  nextCredentials,
  existingCredentials,
}: {
  providerId: string;
  nextCredentials: ICredentials;
  existingCredentials?: ICredentials;
}): ICredentials {
  if (providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
    return nextCredentials;
  }

  const incomingToken = typeof nextCredentials.token === 'string' ? nextCredentials.token.trim() : '';
  if (incomingToken) {
    return nextCredentials;
  }

  const existingToken = typeof existingCredentials?.token === 'string' ? existingCredentials.token.trim() : '';

  return {
    ...nextCredentials,
    token: existingToken || randomUUID(),
  };
}
