import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { updateAttributes } from '@/editor/utils/update-attribute';
import { CardButtonView } from './card-button-view';

/**
 * A card button maps to the Chat SDK's two button primitives. The type is
 * inferred from `url`, not stored explicitly:
 * - `url` set    -> `<LinkButton url="…">` (opens an explicit URL)
 * - `url` empty  -> `<Button id="…">`      (interactive/action button, URL resolved from the id)
 *
 * Both share `label` and `style`.
 *
 * A `cardButton` only ever lives inside a `cardActions` row (see card-actions.tsx);
 * it is never a top-level block.
 */
export const CARD_BUTTON_NODE_NAME = 'cardButton';

export const allowedCardButtonStyle = ['default', 'primary', 'danger'] as const;
export type AllowedCardButtonStyle = (typeof allowedCardButtonStyle)[number];

export const DEFAULT_CARD_BUTTON_STYLE: AllowedCardButtonStyle = 'default';

export type CardButtonAttributes = {
  label: string;
  isLabelVariable: boolean;

  style: AllowedCardButtonStyle;

  url: string;
  isUrlVariable: boolean;

  actionId: string;
  isActionIdVariable: boolean;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardButton: {
      updateCardButtonAttributes: (attrs: Partial<CardButtonAttributes>) => ReturnType;
    };
  }
}

export const CardButtonExtension = Node.create({
  name: CARD_BUTTON_NODE_NAME,
  group: 'cardButtonItem',
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      label: {
        default: 'Button',
        parseHTML: (element) => element.getAttribute('data-label') || '',
        renderHTML: (attributes) => ({ 'data-label': attributes.label }),
      },
      isLabelVariable: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-is-label-variable') === 'true',
        renderHTML: (attributes) => (attributes.isLabelVariable ? { 'data-is-label-variable': 'true' } : {}),
      },

      style: {
        default: DEFAULT_CARD_BUTTON_STYLE,
        parseHTML: (element) => element.getAttribute('data-style') || DEFAULT_CARD_BUTTON_STYLE,
        renderHTML: (attributes) => ({ 'data-style': attributes.style }),
      },

      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-url') || '',
        renderHTML: (attributes) => ({ 'data-url': attributes.url }),
      },
      isUrlVariable: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-is-url-variable') === 'true',
        renderHTML: (attributes) => (attributes.isUrlVariable ? { 'data-is-url-variable': 'true' } : {}),
      },

      actionId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-action-id') || '',
        renderHTML: (attributes) => ({ 'data-action-id': attributes.actionId }),
      },
      isActionIdVariable: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-is-action-id-variable') === 'true',
        renderHTML: (attributes) => (attributes.isActionIdVariable ? { 'data-is-action-id-variable': 'true' } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': this.name,
      }),
    ];
  },

  addCommands() {
    return {
      updateCardButtonAttributes: (attrs) => updateAttributes(this.name, attrs),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardButtonView, {
      contentDOMElementTag: 'div',
      className: 'mly-relative',
    });
  },
});
