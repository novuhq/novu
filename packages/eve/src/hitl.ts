import { Actions, Button, Card } from '@novu/framework';
import type { CardChild, ReplyContent } from '@novu/framework';

/**
 * Human-in-the-loop bridge: render Eve's `input.requested` payloads as Novu
 * interactive cards, and decode the resulting button click / freeform submit
 * back into an Eve `inputResponses` entry.
 *
 * Button/input ids carry the `requestId` + `optionId` so an inbound action can
 * be matched to the parked Eve request with no server-side state. A sentinel
 * `optionId` marks the freeform text field.
 */

const ACTION_PREFIX = 'nh_';
const FREEFORM_OPTION = '__freeform__';

/** One pending input request, mirroring Eve's `InputRequest` (subset we render). */
export interface RenderableInputRequest {
  readonly requestId: string;
  readonly prompt: string;
  readonly allowFreeform?: boolean;
  readonly display?: 'confirmation' | 'select' | 'text';
  readonly options?: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly style?: 'default' | 'primary' | 'danger';
  }>;
}

/** Decoded HITL action: which parked request + option a click maps to. */
export interface DecodedHitlAction {
  readonly requestId: string;
  readonly optionId: string;
}

export function encodeHitlActionId(requestId: string, optionId: string): string {
  return ACTION_PREFIX + Buffer.from(JSON.stringify({ r: requestId, o: optionId }), 'utf8').toString('base64url');
}

export function decodeHitlActionId(actionId: string | undefined | null): DecodedHitlAction | null {
  if (!actionId || !actionId.startsWith(ACTION_PREFIX)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(actionId.slice(ACTION_PREFIX.length), 'base64url').toString('utf8')) as {
      r?: unknown;
      o?: unknown;
    };
    if (typeof parsed.r !== 'string' || typeof parsed.o !== 'string') return null;
    return { requestId: parsed.r, optionId: parsed.o };
  } catch {
    return null;
  }
}

/**
 * Turn a decoded action + its platform `value` into the Eve `inputResponses`
 * entry shape. A freeform submit carries the user's text; an option click
 * carries the `optionId`.
 */
export function toInputResponse(
  decoded: DecodedHitlAction,
  value: string | undefined,
): { requestId: string; optionId?: string; text?: string } {
  if (decoded.optionId === FREEFORM_OPTION) {
    return { requestId: decoded.requestId, text: value };
  }
  return { requestId: decoded.requestId, optionId: decoded.optionId, text: value };
}

/** Render pending input requests as a Novu card reply. */
export function renderInputRequests(requests: ReadonlyArray<RenderableInputRequest>): ReplyContent {
  // Eve emits requests one at a time in practice; render the first.
  const req = requests[0];
  if (!req) return { markdown: '' };

  const buttons = (req.options ?? []).map((option) =>
    Button({
      id: encodeHitlActionId(req.requestId, option.id),
      label: option.label,
      value: option.id,
      ...(option.style ? { style: option.style } : {}),
    }),
  );

  // Card bodies render option buttons; freeform text capture (Eve `allowFreeform`)
  // is a follow-up — those platforms accept a normal reply message instead.
  const children: CardChild[] = [];
  if (buttons.length) children.push(Actions(buttons));

  return { card: Card({ title: req.prompt, children }) };
}
