import { Editor, findParentNode, mergeAttributes, Node } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection, Selection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CARD_BUTTON_NODE_NAME } from '../card-button/card-button';
import { CardActionsView } from './card-actions-view';

/**
 * `cardActions` is the inline "actions row" container for the Rich Chat editor.
 * It wraps one to `MAX_CARD_BUTTONS` `cardButton` children rendered inline. Buttons
 * only ever live inside this container, so inserting a button always yields (or
 * appends to) a row. The compiler groups the row into a single `actions` element.
 */
export const CARD_ACTIONS_NODE_NAME = 'cardActions';

export const MAX_CARD_BUTTONS = 3;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardActions: {
      /** Insert a new actions row, or append a button to the row under the selection. */
      setCardButton: () => ReturnType;
      /** Append a button to the actions row under the selection (no-op at the max). */
      addCardButton: () => ReturnType;
      /** Remove a button from the row (deletes the row when it becomes empty). */
      removeCardButton: (index?: number) => ReturnType;
      /** Select a button in the current row by its index. */
      selectCardButton: (index: number) => ReturnType;
    };
  }
}

export type CardActionsMatch = { node: ProseMirrorNode; pos: number };

/**
 * Resolves the actions row for the current selection, whether the row node itself
 * is node-selected (clicking the row background) or a `cardButton` child is selected.
 */
export function findCardActionsFromSelection(selection: Selection): CardActionsMatch | null {
  if (selection instanceof NodeSelection && selection.node.type.name === CARD_ACTIONS_NODE_NAME) {
    return { node: selection.node, pos: selection.from };
  }

  const parentMatch = findParentNode((node) => node.type.name === CARD_ACTIONS_NODE_NAME)(selection);

  return parentMatch ? { node: parentMatch.node, pos: parentMatch.pos } : null;
}

export function findCardActions(editor: Editor): CardActionsMatch | null {
  return findCardActionsFromSelection(editor.state.selection);
}

/**
 * Clears the card-button / cardActions node selection so the Actions bubble's `shouldShow`
 * returns false.
 *
 * Prefer a caret in the nearest valid textblock outside the row. Placing TipTap's
 * `setTextSelection` at `pos + nodeSize` when the row is last lands on a doc-level gap
 * (not a textblock); ProseMirror then clamps back inside `cardActions` and the bubble stays open.
 */
export function dismissCardActionsMenu(editor: Editor): void {
  const match = findCardActions(editor);

  if (!match) {
    return;
  }

  const { doc } = editor.state;
  const afterPos = match.pos + match.node.nodeSize;

  // Prefer content before the row (usually a paragraph). `Selection.near` finds a valid
  // textblock/gap cursor; raw positions after an isolating block often are not.
  const candidates: Selection[] = [Selection.near(doc.resolve(match.pos), -1)];

  if (afterPos <= doc.content.size) {
    candidates.push(Selection.near(doc.resolve(afterPos), 1));
  }

  candidates.push(Selection.atStart(doc), Selection.atEnd(doc));

  const selection = candidates.find((candidate) => !findCardActionsFromSelection(candidate));

  if (!selection) {
    return;
  }

  editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
}

/**
 * Index of the button under the current selection within its row. `cardButton`
 * nodes are atoms (nodeSize 1), so a child's start position is `row.pos + 1 + index`.
 */
export function getActiveCardButtonIndex(match: CardActionsMatch, from: number): number {
  let activeIndex = 0;

  match.node.forEach((child, offset, index) => {
    const start = match.pos + 1 + offset;

    if (from >= start && from < start + child.nodeSize) {
      activeIndex = index;
    }
  });

  return activeIndex;
}

export const CardActionsExtension = Node.create({
  name: CARD_ACTIONS_NODE_NAME,
  group: 'block',
  content: `${CARD_BUTTON_NODE_NAME}+`,
  draggable: true,
  isolating: true,
  selectable: true,

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
      0,
    ];
  },

  addCommands() {
    return {
      setCardButton:
        () =>
        ({ state, chain }) => {
          const match = findCardActionsFromSelection(state.selection);
          const button = { type: CARD_BUTTON_NODE_NAME, attrs: {} };

          if (match && match.node.childCount < MAX_CARD_BUTTONS) {
            const insertPos = match.pos + match.node.nodeSize - 1;

            return chain().insertContentAt(insertPos, button).setNodeSelection(insertPos).run();
          }

          return chain()
            .insertContent({ type: this.name, attrs: {}, content: [button] })
            .run();
        },

      addCardButton:
        () =>
        ({ state, chain }) => {
          const match = findCardActionsFromSelection(state.selection);

          if (!match || match.node.childCount >= MAX_CARD_BUTTONS) {
            return false;
          }

          const insertPos = match.pos + match.node.nodeSize - 1;

          return chain()
            .insertContentAt(insertPos, { type: CARD_BUTTON_NODE_NAME, attrs: {} })
            .setNodeSelection(insertPos)
            .run();
        },

      removeCardButton:
        (index?: number) =>
        ({ state, tr, dispatch }) => {
          const match = findCardActionsFromSelection(state.selection);

          if (!match) {
            return false;
          }

          const targetIndex = index ?? getActiveCardButtonIndex(match, state.selection.from);

          if (!dispatch) {
            return true;
          }

          if (match.node.childCount <= 1) {
            tr.delete(match.pos, match.pos + match.node.nodeSize);

            return true;
          }

          const buttonFrom = match.pos + 1 + targetIndex;
          tr.delete(buttonFrom, buttonFrom + 1);

          const newIndex = Math.max(0, targetIndex - 1);
          const newPos = match.pos + 1 + newIndex;
          tr.setSelection(NodeSelection.create(tr.doc, newPos));

          return true;
        },

      selectCardButton:
        (index: number) =>
        ({ state, commands }) => {
          const match = findCardActionsFromSelection(state.selection);

          if (!match || index < 0 || index >= match.node.childCount) {
            return false;
          }

          return commands.setNodeSelection(match.pos + 1 + index);
        },
    };
  },

  addNodeView() {
    // No `contentDOMElementTag`: NodeViewContent is the content DOM directly, so the
    // inline flex layout applies to the element that actually holds the buttons.
    return ReactNodeViewRenderer(CardActionsView, {
      className: 'mly-relative',
    });
  },
});
