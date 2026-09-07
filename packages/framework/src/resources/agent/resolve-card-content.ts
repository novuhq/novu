import {
  Actions,
  Button,
  Card,
  type CardElement,
  CardLink,
  CardText,
  Divider,
  ExternalSelect,
  Field,
  Fields,
  Image,
  LinkButton,
  Modal,
  RadioSelect,
  Section,
  Select,
  SelectOption,
  Table,
  TextInput,
} from 'chat';
import { isCardElement } from './guards';

const CHAT_JSX_ELEMENT = Symbol.for('chat.jsx.element');

/**
 * Chat factories have non-JSX call signatures (e.g. `CardText(content, options)`).
 * Invoking them as React-style components would corrupt the tree, so they must
 * be left for `toCardElement`.
 */
const CHAT_JSX_PRIMITIVES = new Set<Function>([
  Actions,
  Button,
  Card,
  CardLink,
  CardText,
  Divider,
  ExternalSelect,
  Field,
  Fields,
  Image,
  LinkButton,
  Modal,
  RadioSelect,
  Section,
  Select,
  SelectOption,
  Table,
  TextInput,
]);

type ChatJsxElement = {
  $$typeof: symbol;
  type: unknown;
  props?: Record<string, unknown>;
  children?: unknown;
};

function isChatJsxElement(value: unknown): value is ChatJsxElement {
  return typeof value === 'object' && value !== null && (value as { $$typeof?: unknown }).$$typeof === CHAT_JSX_ELEMENT;
}

/**
 * Chat's JSX runtime only understands built-in primitives (`Card`, `CardText`, …).
 * Custom components like `<AnglesCard />` are not invoked — they collapse to an
 * empty `{ type: "card", children: [] }`, which Telegram then rejects as
 * "Message text cannot be empty".
 *
 * Resolve user function components before `toCardElement`.
 */
export async function resolveCardContent(content: unknown): Promise<CardElement | null> {
  const resolved = resolveUserComponents(content);

  if (resolved && typeof resolved === 'object' && isCardElement(resolved)) {
    return resolved;
  }

  const { isJSX, toCardElement } = await import('chat/jsx-runtime');

  if (isJSX(resolved)) {
    return toCardElement(resolved);
  }

  return null;
}

function resolveUserComponents(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((child) => resolveUserComponents(child));
  }

  if (!isChatJsxElement(value)) {
    return value;
  }

  if (typeof value.type === 'function' && !CHAT_JSX_PRIMITIVES.has(value.type)) {
    const props: Record<string, unknown> = { ...(value.props ?? {}) };

    if (value.children !== undefined) {
      props.children = value.children;
    }

    return resolveUserComponents((value.type as (props: Record<string, unknown>) => unknown)(props));
  }

  return {
    ...value,
    children: resolveUserComponents(value.children),
  };
}
