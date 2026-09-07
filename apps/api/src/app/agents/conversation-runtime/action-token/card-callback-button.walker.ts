import type { ButtonElement, CardChild, CardElement } from 'chat';

export const TELEGRAM_CALLBACK_DATA_PREFIX = 'chat:';
export const TELEGRAM_CALLBACK_DATA_LIMIT_BYTES = 64;

type ActionBlockChild = ButtonElement | { type: string; id?: string; value?: string; label?: string };

export function encodedTelegramCallbackDataByteLength(actionId: string, value?: string): number {
  const payload: { a: string; v?: string } = { a: actionId };

  if (typeof value === 'string') {
    payload.v = value;
  }

  const callbackData = `${TELEGRAM_CALLBACK_DATA_PREFIX}${JSON.stringify(payload)}`;

  return Buffer.byteLength(callbackData, 'utf8');
}

export function callbackPayloadNeedsTokenization(actionId: string, value?: string): boolean {
  return encodedTelegramCallbackDataByteLength(actionId, value) > TELEGRAM_CALLBACK_DATA_LIMIT_BYTES;
}

function isActionsBlock(child: CardChild): child is CardChild & { type: 'actions'; children: ActionBlockChild[] } {
  return child.type === 'actions' && Array.isArray(child.children);
}

function isSectionBlock(child: CardChild): child is CardChild & { type: 'section'; children: CardChild[] } {
  return child.type === 'section' && Array.isArray(child.children);
}

function asCallbackButton(action: ActionBlockChild): ButtonElement | null {
  if (action.type !== 'button') {
    return null;
  }

  const button = action as ButtonElement;
  if (typeof button.id !== 'string' || !button.id) {
    return null;
  }

  return button;
}

export async function forEachCallbackButton(
  card: CardElement,
  visit: (button: ButtonElement) => void | Promise<void>
): Promise<void> {
  const children = card.children;

  if (!Array.isArray(children)) {
    return;
  }

  await walkCardChildren(children, visit);
}

async function walkCardChildren(
  children: CardChild[],
  visit: (button: ButtonElement) => void | Promise<void>
): Promise<void> {
  for (const child of children) {
    if (isActionsBlock(child)) {
      await walkActionBlockChildren(child.children, visit);
      continue;
    }

    if (isSectionBlock(child)) {
      await walkCardChildren(child.children, visit);
    }
  }
}

async function walkActionBlockChildren(
  actions: ActionBlockChild[],
  visit: (button: ButtonElement) => void | Promise<void>
): Promise<void> {
  for (const action of actions) {
    const button = asCallbackButton(action);
    if (!button) {
      continue;
    }

    await visit(button);
  }
}
