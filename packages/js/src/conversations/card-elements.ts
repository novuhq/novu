/**
 * Structural types for the portable card JSON delivered by agent replies.
 * This is the Chat SDK CardElement / CardChild shape (the same vocabulary the
 * Slack/Teams/email adapters translate) — kept as a structural copy so
 * `@novu/js` carries no runtime or type dependency on the ESM-only `chat`
 * package.
 *
 * Known node `type` slugs: `card`, `text`, `divider`, `image`, `actions`,
 * `button`, `link-button`, `link`, `section`, `field`, `fields`, `select`,
 * `input`. Renderers should ignore unknown node types (forward compatible).
 */
export interface CardElement {
  type: string;
  /** Set on `button` nodes — the `id` prop of the source `<Button>`. */
  id?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  label?: string;
  value?: string;
  url?: string;
  imageUrl?: string;
  style?: string;
  children?: CardElement[];
  props?: Record<string, unknown>;
}

export function getCardNodeId(node: CardElement): string | undefined {
  if (typeof node.id === 'string' && node.id.length > 0) return node.id;
  const propsId = node.props?.id;

  return typeof propsId === 'string' && propsId.length > 0 ? propsId : undefined;
}

export function getCardNodeValue(node: CardElement): string | undefined {
  if (typeof node.value === 'string') return node.value;
  const propsValue = node.props?.value;

  return typeof propsValue === 'string' ? propsValue : undefined;
}
