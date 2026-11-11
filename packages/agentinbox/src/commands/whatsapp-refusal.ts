import { ApiError } from '../api/client';
import { errorCode } from '../api/listen';
import { CLI_COMMAND } from '../config';

export const WHATSAPP_WINDOW_CLOSED = 'whatsapp_window_closed';
const WHATSAPP_TOO_MANY_BUTTONS = 'whatsapp_too_many_buttons';

interface WhatsAppRefusalBody {
  subscriberId?: string;
  windowClosedAt?: string;
  maxButtons?: number;
  buttons?: number;
  availableChannels?: string[];
}

/**
 * Why the API wouldn't send this on WhatsApp, and what to do instead, when it refused with one of its WhatsApp
 * codes: the person's window is shut, or the card has more buttons than WhatsApp shows. Undefined for anything
 * else.
 */
export function describeWhatsAppRefusal(err: unknown): string | undefined {
  if (!(err instanceof ApiError) || err.status !== 422) {
    return undefined;
  }

  const code = errorCode(err);
  if (code !== WHATSAPP_WINDOW_CLOSED && code !== WHATSAPP_TOO_MANY_BUTTONS) {
    return undefined;
  }

  const body = err.body as WhatsAppRefusalBody;
  const who = body.subscriberId ?? 'They';
  const reason =
    code === WHATSAPP_WINDOW_CLOSED
      ? `WhatsApp can't reach ${who} right now: it only lets the agent write within 24 hours of their last message${
          body.windowClosedAt ? `, and theirs closed ${formatWhen(body.windowClosedAt)}` : ''
        }. It opens again when they write to you.`
      : `WhatsApp shows at most ${body.maxButtons ?? 3} buttons and this has ${body.buttons ?? 'more'}. Offer ${
          body.maxButtons ?? 3
        } options or fewer.`;

  return `${reason}\n${instead(body)}`;
}

function instead(body: WhatsAppRefusalBody): string {
  const channels = body.availableChannels ?? [];
  if (channels.length > 0) {
    return `Send it with --via ${channels[0]} instead${
      channels.length > 1 ? ` (they're also on ${channels.slice(1).join(', ')})` : ''
    }.`;
  }

  return body.subscriberId
    ? `${body.subscriberId} has no other channel: add one with \`${CLI_COMMAND} contact invite ${body.subscriberId}\`.`
    : `Add another channel for them with \`${CLI_COMMAND} contact invite\`.`;
}

/** `2026-11-10T14:05:00Z` → "on Tue, Nov 10, 02:05 PM" in the operator's local time. */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return `at ${iso}`;
  }

  return `on ${date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
