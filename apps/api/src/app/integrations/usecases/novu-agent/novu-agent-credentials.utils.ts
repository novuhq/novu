import { EmailProviderIdEnum, type ICredentials } from '@novu/shared';

/**
 * The NovuAgent integration owns two routing-control fields that the API
 * update path must never let a client overwrite:
 *
 * - `inboxRoutingKey` — opaque routing segment of the shared-inbox address.
 *                       Backed by a partial unique index; rotating it is the
 *                       moral equivalent of changing the integration's email
 *                       address and should only happen through an explicit
 *                       server-side flow.
 * - `secretKey`        — HMAC secret used to sign inbound webhook payloads.
 *                       Same property as on other agent providers: minted at
 *                       provision time and never re-supplied by the client.
 *
 * If the incoming credentials drop either field (e.g. the dashboard sends the
 * subset that the user actually edited), we re-apply the server-stored value.
 * If the client tries to *change* a value, we ignore the change and keep the
 * existing one — saves us from a malformed input nuking the integration.
 */
export function ensureNovuAgentManagedCredentials({
  providerId,
  nextCredentials,
  existingCredentials,
}: {
  providerId: string;
  nextCredentials: ICredentials;
  existingCredentials?: ICredentials;
}): ICredentials {
  if (providerId !== EmailProviderIdEnum.NovuAgent) {
    return nextCredentials;
  }

  const merged: ICredentials = { ...nextCredentials };

  if (existingCredentials?.inboxRoutingKey) {
    merged.inboxRoutingKey = existingCredentials.inboxRoutingKey;
  } else {
    delete merged.inboxRoutingKey;
  }

  if (existingCredentials?.secretKey) {
    merged.secretKey = existingCredentials.secretKey;
  }

  return merged;
}
