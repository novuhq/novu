import type { ChannelEndpointEntity } from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';

/**
 * When a number proved itself by sending a wa.me code, kept on its `phone` endpoint next to `phoneNumber`. The
 * channel-endpoints API only accepts a `phone` endpoint that is exactly `{ phoneNumber }`, and an update there
 * replaces the whole endpoint, so a number written or changed through it never carries this field.
 */
export const WHATSAPP_NUMBER_PROVED_AT_FIELD = 'provedAt';

/** When the number on a `phone` endpoint proved itself, which is when its owner connected WhatsApp. */
export function whatsAppNumberProvedAtOf(endpoint: Pick<ChannelEndpointEntity, 'endpoint'>): string | undefined {
  const provedAt = (endpoint.endpoint as Record<string, unknown>)[WHATSAPP_NUMBER_PROVED_AT_FIELD];

  return typeof provedAt === 'string' ? provedAt : undefined;
}

/**
 * The number on a `phone` endpoint that proved itself on a WhatsApp Business integration, or `undefined`. Only
 * these reach a person on WhatsApp; any other `phone` endpoint, on WhatsApp or SMS, is no proof.
 */
export function provedWhatsAppNumberOf(
  endpoint: Pick<ChannelEndpointEntity, 'type' | 'providerId' | 'endpoint'> | null | undefined
): string | undefined {
  if (endpoint?.type !== ENDPOINT_TYPES.PHONE || endpoint.providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
    return undefined;
  }

  const data = endpoint.endpoint as Record<string, unknown>;
  const phoneNumber = data.phoneNumber;

  return typeof phoneNumber === 'string' && typeof data[WHATSAPP_NUMBER_PROVED_AT_FIELD] === 'string'
    ? phoneNumber
    : undefined;
}
