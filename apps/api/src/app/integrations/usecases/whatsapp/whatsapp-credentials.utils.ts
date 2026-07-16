import { randomUUID } from 'node:crypto';
import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';

/** Novu's Meta Tech Provider app credentials, present only on deployments that support Embedded Signup. */
export function getNovuWhatsAppPlatformConfig(): { appId: string; appSecret: string } | undefined {
  const appId = process.env.NOVU_WHATSAPP_APP_ID?.trim();
  const appSecret = process.env.NOVU_WHATSAPP_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return undefined;
  }

  return { appId, appSecret };
}

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

/**
 * For WhatsApp Business agent integrations Novu manages the webhook Verify
 * Token automatically: it's just a shared secret echoed back to Meta during
 * the webhook handshake, so making the user invent and paste one is friction
 * with no security benefit. We auto-fill it on the first save and leave it
 * untouched on subsequent updates so Meta's stored value keeps matching.
 *
 * Patches are merged over existing credentials so stamp-only / partial updates
 * (manual "I've already set a permanent token", empty secret inputs omitted by
 * the form cleaner) cannot wipe Access Token, App Secret, Phone Number ID, etc.
 */
export function ensureWhatsAppManagedCredentials({
  providerId,
  nextCredentials,
  existingCredentials,
  allowManagedFlagChange = false,
}: {
  providerId: string;
  nextCredentials: ICredentials;
  existingCredentials?: ICredentials;
  /**
   * `isNovuManaged` switches credential resolution to Novu's shared Meta Tech
   * Provider app (NOVU_WHATSAPP_APP_ID / _SECRET), so it must only be set by the
   * trusted server-side embedded-signup flow — never flipped via a client
   * credentials update, which would let a tenant borrow the platform app context.
   */
  allowManagedFlagChange?: boolean;
}): ICredentials {
  if (providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
    return nextCredentials;
  }

  const merged: ICredentials = {
    ...(existingCredentials ?? {}),
    ...nextCredentials,
  };

  if (!allowManagedFlagChange) {
    if (existingCredentials && 'isNovuManaged' in existingCredentials) {
      merged.isNovuManaged = existingCredentials.isNovuManaged;
    } else {
      delete merged.isNovuManaged;
    }
  }

  // Empty-string overwrites from partial forms would still clobber secrets after
  // the spread; restore the stored value whenever the incoming secret is blank.
  for (const key of ['apiToken', 'secretKey'] as const) {
    const incoming = typeof merged[key] === 'string' ? merged[key].trim() : '';
    const existing = typeof existingCredentials?.[key] === 'string' ? existingCredentials[key].trim() : '';

    if (!incoming && existing) {
      merged[key] = existingCredentials![key];
    }
  }

  const incomingToken = typeof merged.token === 'string' ? merged.token.trim() : '';
  if (incomingToken) {
    return merged;
  }

  const existingToken = typeof existingCredentials?.token === 'string' ? existingCredentials.token.trim() : '';

  return {
    ...merged,
    token: existingToken || randomUUID(),
  };
}
