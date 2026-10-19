import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';
import { findCardActions, getActiveCardButtonIndex, MAX_CARD_BUTTONS } from '@/editor/nodes/card-actions/card-actions';
import {
  AllowedCardButtonStyle,
  CardButtonAttributes,
  DEFAULT_CARD_BUTTON_STYLE,
} from '@/editor/nodes/card-button/card-button';

export type CardActionButtonState = {
  label: string;
  isLabelVariable: boolean;
  style: AllowedCardButtonStyle;
  url: string;
  isUrlVariable: boolean;
};

export type CardActionsState = {
  isActive: boolean;
  buttons: CardActionButtonState[];
  activeIndex: number;
  canAddButton: boolean;
};

const EMPTY_STATE: CardActionsState = {
  isActive: false,
  buttons: [],
  activeIndex: 0,
  canAddButton: false,
};

export const useCardActionsState = (editor: Editor): CardActionsState => {
  return useEditorState({
    editor,
    selector: (ctx) => {
      const { editor: currentEditor } = ctx;

      if (!currentEditor) {
        return EMPTY_STATE;
      }

      const match = findCardActions(currentEditor);

      if (!match) {
        return EMPTY_STATE;
      }

      const buttons: CardActionButtonState[] = [];

      match.node.forEach((child) => {
        const attrs = child.attrs as CardButtonAttributes;

        buttons.push({
          label: attrs.label ?? '',
          isLabelVariable: attrs.isLabelVariable ?? false,
          style: attrs.style ?? DEFAULT_CARD_BUTTON_STYLE,
          url: attrs.url ?? '',
          isUrlVariable: attrs.isUrlVariable ?? false,
        });
      });

      return {
        isActive: true,
        buttons,
        activeIndex: getActiveCardButtonIndex(match, currentEditor.state.selection.from),
        canAddButton: buttons.length < MAX_CARD_BUTTONS,
      };
    },
    equalityFn: deepEql,
  });
};
