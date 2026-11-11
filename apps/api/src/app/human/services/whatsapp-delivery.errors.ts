import { UnprocessableEntityException } from '@nestjs/common';
import type { HumanChannelViaEnum } from '@novu/shared';

/** WhatsApp shows at most this many reply buttons; the adapter drops the rest without a word. */
export const WHATSAPP_MAX_REPLY_BUTTONS = 3;

export const WHATSAPP_WINDOW_CLOSED = 'whatsapp_window_closed';
export const WHATSAPP_TOO_MANY_BUTTONS = 'whatsapp_too_many_buttons';

export type WhatsAppUnfit =
  | { reason: typeof WHATSAPP_WINDOW_CLOSED; windowClosedAt?: string }
  | { reason: typeof WHATSAPP_TOO_MANY_BUTTONS; buttons: number };

/**
 * WhatsApp can't carry this send, refused before it reaches Meta, with what an agent can do instead: the person's
 * other channels that still work. A 422 with a typed `code`, never a delivery failure an agent would retry.
 */
export class WhatsAppUndeliverableException extends UnprocessableEntityException {
  constructor(subscriberId: string, unfit: WhatsAppUnfit, availableChannels: HumanChannelViaEnum[]) {
    const instead = availableChannels.length
      ? ` Send with --via ${availableChannels[0]} instead.`
      : ` ${subscriberId} has no other channel; run \`npx @agentinbox/cli contact invite ${subscriberId}\` to add one.`;

    if (unfit.reason === WHATSAPP_WINDOW_CLOSED) {
      const when = unfit.windowClosedAt ? `: their window closed at ${unfit.windowClosedAt}` : '';
      super({
        code: WHATSAPP_WINDOW_CLOSED,
        message: `WhatsApp can't reach ${subscriberId} until they write to you again${when}.${instead}`,
        subscriberId,
        ...(unfit.windowClosedAt ? { windowClosedAt: unfit.windowClosedAt } : {}),
        availableChannels,
      });

      return;
    }

    super({
      code: WHATSAPP_TOO_MANY_BUTTONS,
      message: `WhatsApp shows at most ${WHATSAPP_MAX_REPLY_BUTTONS} buttons and this card has ${unfit.buttons}. Offer at most ${WHATSAPP_MAX_REPLY_BUTTONS} choices.${instead}`,
      subscriberId,
      maxButtons: WHATSAPP_MAX_REPLY_BUTTONS,
      buttons: unfit.buttons,
      availableChannels,
    });
  }
}

export function isWhatsAppUndeliverable(error: unknown): error is WhatsAppUndeliverableException {
  return error instanceof WhatsAppUndeliverableException;
}
