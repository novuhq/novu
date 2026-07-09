/**
 * Cross-platform chat card passed to chat providers, serialized natively per
 * platform (Slack Block Kit, Teams Adaptive Cards, Telegram, WhatsApp) and
 * degraded to markdown text elsewhere.
 *
 * Structural twin of `ChatCard` in `@novu/shared` (packages/shared/src/types/chat-card.types.ts)
 * — kept local because `@novu/stateless` is dependency-free. Update both together.
 */
export type ChatCardTextElement = {
  type: 'text';
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
