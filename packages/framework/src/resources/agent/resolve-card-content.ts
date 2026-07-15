import {
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
  type CardElement,
} from 'chat';
import { isCardElement } from './guards';

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

type JsxLikeElement = {
  $$typeof: symbol;
  type: unknown;
  props?: Record<string, unknown>;
  children?: unknown;
};

function isJsxLikeElement(value: unknown): value is JsxLikeElement {
  if (typeof value !== 'object' || value === null || !('$$typeof' in value)) {
    return false;
  }

  const element = value as { $$typeof?: unknown };
  if (typeof element.$$typeof !== 'symbol') {
    return false;
  }

  const symbol = element.$$typeof.toString();

  return (
    symbol.includes('chat.jsx.element') ||
    symbol.includes('react.element') ||
    symbol.includes('react.transitional.element')
  );
}

function isFunctionComponent(type: unknown): type is (props: Record<string, unknown>) => unknown {
  return typeof type === 'function';
}

/**
 * Chat's JSX runtime only understands built-in primitives (`Card`, `CardText`, …).
 * Custom components like `<AnglesCard />` are not invoked — they collapse to an
 * empty `{ type: "card", children: [] }`, which Telegram then rejects as
 * "Message text cannot be empty".
 *
 * Resolve user function components (chat + React JSX) before `toCardElement`.
 */
export async function resolveCardContent(content: unknown): Promise<CardElement | null> {
  const resolved = resolveFunctionComponents(content);

  if (resolved && typeof resolved === 'object' && isCardElement(resolved)) {
    return resolved;
  }

  const { isJSX, toCardElement } = await import('chat/jsx-runtime');

  if (isJSX(resolved)) {
    return toCardElement(resolved);
  }

  return null;
}

function resolveFunctionComponents(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((child) => resolveFunctionComponents(child));
  }

  if (!isJsxLikeElement(value)) {
    return value;
  }

  if (isFunctionComponent(value.type) && !CHAT_JSX_PRIMITIVES.has(value.type)) {
    const props: Record<string, unknown> = { ...(value.props ?? {}) };

    if (value.children !== undefined) {
      props.children = value.children;
    }

    return resolveFunctionComponents(value.type(props));
  }

  return {
    ...value,
    children: resolveFunctionComponents(value.children),
    props: value.props
      ? {
          ...value.props,
          ...(value.props.children !== undefined
            ? { children: resolveFunctionComponents(value.props.children) }
            : {}),
        }
      : value.props,
  };
}
