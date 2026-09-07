/**
 * Novu-owned card JSON on the agent wire.
 *
 * Matches the full Chat SDK kit agents emit (`section` / `fields` / `table` /
 * `button` / `select` / `radio_select`) plus Novu fields on buttons
 * (`actionType`, `callbackUrl`, `disabled`). Chat SDK stays the authoring
 * frontend (`@novu/framework`); this type is the contract `@novu/js` and the
 * event protocol share. The dashboard Maily editor still authors the smaller
 * `@novu/shared` v1 subset (link-buttons only).
 *
 * Compatibility locks in `packages/framework/src/resources/agent/card-element-compat.test-d.ts`:
 * `chat.CardElement` and `@novu/stateless` `CardElement` must assign to this type.
 * Do not add `chat` or `@novu/stateless` as a dependency here.
 */

export type CardElementTextElement = {
  type: 'text';
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

/** Presentational inline hyperlink (Chat SDK `CardLink`). */
export type CardElementLinkElement = {
  type: 'link';
  label: string;
  url: string;
};

export type CardElementLinkButtonElement = {
  type: 'link-button';
  label: string;
  url: string;
  style?: 'primary' | 'danger' | 'default';
  /** Optional author-provided id; platform serializers use it (e.g. Slack `action_id`). */
  id?: string;
};

/** Interactive action button (Chat SDK `Button`). Drives `sendAction` in web chat. */
export type CardElementButtonElement = {
  type: 'button';
  id: string;
  label: string;
  style?: 'primary' | 'danger' | 'default';
  actionType?: 'action' | 'modal';
  callbackUrl?: string;
  value?: string;
  disabled?: boolean;
};

export type CardElementSelectOptionElement = {
  label: string;
  value: string;
  description?: string;
};

/** Chat SDK `Select`. */
export type CardElementSelectElement = {
  type: 'select';
  id: string;
  label: string;
  options: CardElementSelectOptionElement[];
  initialOption?: string;
  optional?: boolean;
  placeholder?: string;
};

/** Chat SDK `RadioSelect`. */
export type CardElementRadioSelectElement = {
  type: 'radio_select';
  id: string;
  label: string;
  options: CardElementSelectOptionElement[];
  initialOption?: string;
  optional?: boolean;
};

export type CardElementActionChild =
  | CardElementLinkButtonElement
  | CardElementButtonElement
  | CardElementSelectElement
  | CardElementRadioSelectElement;

export type CardElementActionsElement = {
  type: 'actions';
  children: CardElementActionChild[];
};

export type CardElementFieldElement = {
  type: 'field';
  label: string;
  value: string;
};

export type CardElementFieldsElement = {
  type: 'fields';
  children: CardElementFieldElement[];
};

export type CardElementTableElement = {
  type: 'table';
  headers: string[];
  rows: string[][];
  align?: Array<'left' | 'center' | 'right'>;
};

export type CardElementSectionElement = {
  type: 'section';
  children: CardElementChild[];
};

/** Includes top-level `button` — agents emit that shape, not only `actions` wrappers. */
export type CardElementChild =
  | CardElementTextElement
  | CardElementImageElement
  | CardElementDividerElement
  | CardElementLinkElement
  | CardElementButtonElement
  | CardElementActionsElement
  | CardElementSectionElement
  | CardElementFieldsElement
  | CardElementTableElement;

export type CardElement = {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: CardElementChild[];
};
