/**
 * Structured card content for agent web chat.
 *
 * Aligns with the Chat SDK `CardElement` shape agents emit via `@novu/framework`,
 * including postback `button` children that drive `sendAction`. The wire protocol
 * still carries cards as JSON; these types describe the validated server shape.
 */

export type AgentCardButtonStyle = 'primary' | 'danger' | 'default';

export type AgentCardTextElement = {
  type: 'text';
  content: string;
  style?: 'plain' | 'bold' | 'muted';
};

export type AgentCardImageElement = {
  type: 'image';
  url: string;
  alt?: string;
};

export type AgentCardDividerElement = {
  type: 'divider';
};

export type AgentCardLinkElement = {
  type: 'link';
  label: string;
  url: string;
};

/** Postback button — click calls `sendAction` with `id` (and optional `value`). */
export type AgentCardButtonElement = {
  type: 'button';
  id: string;
  label: string;
  style?: AgentCardButtonStyle;
  value?: string;
};

/** Opens a URL — rendered as a link, not a postback action. */
export type AgentCardLinkButtonElement = {
  type: 'link-button';
  label: string;
  url: string;
  style?: AgentCardButtonStyle;
  id?: string;
};

export type AgentCardActionChild = AgentCardButtonElement | AgentCardLinkButtonElement;

export type AgentCardActionsElement = {
  type: 'actions';
  children: AgentCardActionChild[];
};

export type AgentCardChild =
  | AgentCardTextElement
  | AgentCardImageElement
  | AgentCardDividerElement
  | AgentCardLinkElement
  | AgentCardButtonElement
  | AgentCardActionsElement;

export type AgentCardElement = {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: AgentCardChild[];
};
