import type { ChatElement } from 'chat';
import type { HumanChrome, HumanInteractionKind, HumanOptionInput } from '../agent.types';
import { buildHumanApproveActionId, buildHumanDenyActionId, buildHumanOptionActionId } from './action-id';

function optionLabel(input: HumanOptionInput): string {
  return typeof input === 'string' ? input : input.label;
}

function optionId(input: HumanOptionInput): string | undefined {
  return typeof input === 'string' ? undefined : input.id;
}

function chooseOptionKey(input: HumanOptionInput): string {
  return typeof input === 'string' ? input : input.id;
}

export function assertHumanTitle(kind: HumanInteractionKind, title: string | undefined): string {
  const resolved = title?.trim();
  if (!resolved) {
    throw new Error(`ctx.${kind} requires a title (string argument or card.title)`);
  }

  return resolved;
}

function titleFromCard(value: object): string | undefined {
  if (!('title' in value)) {
    return undefined;
  }

  const title = value.title;

  return typeof title === 'string' && title.trim() ? title.trim() : undefined;
}

export function assertChooseOptions(options: HumanOptionInput[] | undefined): void {
  if (!options || options.length < 2 || options.length > 10) {
    throw new Error('ctx.choose requires between 2 and 10 options');
  }

  if (options.some((option) => optionLabel(option).trim().length === 0)) {
    throw new Error('ctx.choose options must be non-empty strings');
  }
}

export function assertExtraActions(actions: HumanOptionInput[]): void {
  if (actions.length > 4) {
    throw new Error('ctx.approve card.extraActions supports at most 4 buttons');
  }

  for (const action of actions) {
    const id = optionId(action);
    const label = optionLabel(action);
    if (!label.trim()) {
      throw new Error('ctx.approve extraActions labels must be non-empty');
    }

    if (id === 'approve' || id === 'deny') {
      throw new Error('ctx.approve extraActions ids cannot be approve or deny');
    }
  }
}

function assertHumanRenderElement(rendered: unknown): asserts rendered is ChatElement {
  if (typeof rendered === 'string') {
    throw new Error('human render must return chrome (*Card()), a Card, or a chat element — not a markdown string');
  }
}

function collectButtons(
  node: unknown,
  into: Array<{ id: string; label: string }> = []
): Array<{ id: string; label: string }> {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectButtons(item, into);
    }

    return into;
  }

  if (!node || typeof node !== 'object') {
    return into;
  }

  const record = node as Record<string, unknown>;
  if (record.type === 'button' && typeof record.id === 'string' && record.id.trim()) {
    into.push({ id: record.id, label: typeof record.label === 'string' ? record.label : '' });
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      collectButtons(value, into);
    }
  }

  return into;
}

function collectButtonIds(node: unknown): Set<string> {
  return new Set(collectButtons(node).map((button) => button.id));
}

function extraActionId(buttonId: string, requestId: string): string {
  const prefix = buildHumanOptionActionId(requestId, '');
  if (buttonId.startsWith(prefix) && buttonId.length > prefix.length) {
    return buttonId.slice(prefix.length);
  }

  return buttonId;
}

function assertApproveActionButtons(rendered: unknown, requestId: string): void {
  const buttons = collectButtons(rendered);
  const buttonIds = new Set(buttons.map((button) => button.id));
  const approveId = buildHumanApproveActionId(requestId);
  const denyId = buildHumanDenyActionId(requestId);
  if (!buttonIds.has(approveId)) {
    throw new Error('ctx.approve render must include a button with actionIds.approve');
  }

  if (!buttonIds.has(denyId)) {
    throw new Error('ctx.approve render must include a button with actionIds.deny');
  }

  const extras = buttons
    .filter((button) => button.id !== approveId && button.id !== denyId)
    .map((button) => ({ id: extraActionId(button.id, requestId), label: button.label }));
  if (extras.length) {
    assertExtraActions(extras);
  }
}

function assertChooseActionButtons(
  buttonIds: Set<string>,
  requestId: string,
  chooseOptions?: HumanOptionInput[]
): void {
  if (chooseOptions) {
    assertChooseOptions(chooseOptions);
    for (const option of chooseOptions) {
      const key = chooseOptionKey(option);
      if (!buttonIds.has(buildHumanOptionActionId(requestId, key))) {
        throw new Error(`ctx.choose render must include a button with actionIds.option('${key}')`);
      }
    }

    return;
  }

  const optionButtons = chooseOptionIdsFromButtonIds(buttonIds, requestId);
  if (optionButtons.length < 2 || optionButtons.length > 10) {
    throw new Error('ctx.choose render must include between 2 and 10 option action buttons');
  }
}

function chooseOptionIdsFromButtonIds(buttonIds: Set<string>, requestId: string): string[] {
  const prefix = buildHumanOptionActionId(requestId, '');

  return [...buttonIds]
    .filter((id) => id.startsWith(prefix) && id.length > prefix.length)
    .map((id) => id.slice(prefix.length));
}

/** Title + chrome-specific fields (`extraActions`, `options`) as soon as `*Card()` returns. */
export function assertHumanChrome(
  kind: HumanInteractionKind,
  chrome: HumanChrome,
  chooseOptions?: HumanOptionInput[]
): void {
  assertHumanTitle(kind, chrome.title);

  switch (kind) {
    case 'ask':
    case 'tell':
      return;
    case 'approve':
      if (chrome.type === 'human-approve-card' && chrome.extraActions) {
        assertExtraActions(chrome.extraActions);
      }

      return;
    case 'choose':
      assertChooseOptions(chrome.type === 'human-choose-card' ? (chrome.options ?? chooseOptions) : chooseOptions);

      return;
    default: {
      return;
    }
  }
}

/** Title + required action buttons as soon as `{ render }` returns a Card / chat element. */
export function assertHumanCardElement(
  kind: HumanInteractionKind,
  rendered: unknown,
  requestId: string,
  chooseOptions?: HumanOptionInput[]
): void {
  assertHumanRenderElement(rendered);
  assertHumanTitle(kind, titleFromCard(rendered));

  switch (kind) {
    case 'ask':
    case 'tell':
      return;
    case 'approve':
      assertApproveActionButtons(rendered, requestId);

      return;
    case 'choose':
      assertChooseActionButtons(collectButtonIds(rendered), requestId, chooseOptions);

      return;
    default: {
      return;
    }
  }
}
