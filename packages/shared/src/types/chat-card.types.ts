/**
 * Cross-platform chat card content, rendered natively per provider at delivery
 * (Slack Block Kit, MS Teams Adaptive Cards, Telegram, WhatsApp) and degraded
 * to markdown text elsewhere.
 *
 * This is a structural subset of the Chat SDK's `CardElement` (`chat` npm package),
 * so a `ChatCard` is assignable wherever the Chat SDK expects a card. Only
 * link buttons are supported; action/postback buttons may be added later.
 */
export type ChatCardTextElement = {
  type: 'text';
  /** Markdown content; platform serializers translate the flavor. */
  content: string;
  style?: 'plain' | 'bold' | 'muted';
};

export type ChatCardImageElement = {
  type: 'image';
  url: string;
  alt?: string;
};

export type ChatCardDividerElement = {
  type: 'divider';
};

export type ChatCardLinkButtonElement = {
  type: 'link-button';
  label: string;
  url: string;
  style?: 'primary' | 'danger' | 'default';
};

export type ChatCardActionsElement = {
  type: 'actions';
  children: ChatCardLinkButtonElement[];
};

export type ChatCardChild =
  | ChatCardTextElement
  | ChatCardImageElement
  | ChatCardDividerElement
  | ChatCardActionsElement;

export type ChatCard = {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: ChatCardChild[];
};
