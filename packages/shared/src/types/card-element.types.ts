/**
 * Cross-platform card content, rendered natively per provider at delivery
 * (Slack Block Kit, MS Teams Adaptive Cards, Telegram, WhatsApp) and degraded
 * to markdown text elsewhere.
 *
 * This is a structural superset of the Chat SDK's `CardElement` (`chat` npm package),
 * so a `CardElement` is assignable wherever the Chat SDK expects a card. Only
 * link buttons are supported in v1; action/postback buttons may be added later.
 */

export type CardElementTextElement = {
  type: 'text';
  /** Markdown content; platform serializers translate the flavor. */
  content: string;
  style?: 'plain' | 'bold' | 'muted';
};

export type CardElementImageElement = {
  type: 'image';
  url: string;
  alt?: string;
};

export type CardElementDividerElement = {
  type: 'divider';
};

export type CardElementLinkButtonElement = {
  type: 'link-button';
  label: string;
  url: string;
  style?: 'primary' | 'danger' | 'default';
  /**
   * Optional stable identifier authored in the editor. Platform serializers that require a
   * per-button id (e.g. Slack's `action_id`) use it; when omitted they derive one from the URL.
   */
  id?: string;
};

export type CardElementActionsElement = {
  type: 'actions';
  children: CardElementLinkButtonElement[];
};

export type CardElementChild =
  | CardElementTextElement
  | CardElementImageElement
  | CardElementDividerElement
  | CardElementActionsElement;

export type CardElement = {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: CardElementChild[];
};
