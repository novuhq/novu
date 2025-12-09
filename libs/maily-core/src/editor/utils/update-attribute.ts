import { Command } from '@tiptap/core';

export function updateAttribute(type: string, attr: string, value: any): Command {
  return ({ commands }) =>
    commands.command(({ tr, state, dispatch }) => {
      if (dispatch) {
        let lastPos = null;

        tr.selection.ranges.forEach((range) => {
          state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
            if (node.type.name === type) {
              lastPos = pos;
            }
          });
        });

        if (lastPos !== null) {
          tr.setNodeAttribute(lastPos, attr, value);
        }
      }

      return true;
    });
}

export function updateAttributes(type: string, attrs: Record<string, any>): Command {
  return ({ commands }) =>
    commands.command(({ tr, state, dispatch }) => {
      if (dispatch) {
        let lastPos = null;

        tr.selection.ranges.forEach((range) => {
          state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
            if (node.type.name === type) {
              lastPos = pos;
            }
          });
        });

        if (lastPos !== null) {
          const node = state.doc.nodeAt(lastPos);
          if (node) {
            tr.setNodeMarkup(lastPos, null, {
              ...node.attrs,
              ...attrs,
            });
          } else {
            for (const [key, value] of Object.entries(attrs)) {
              tr.setNodeAttribute(lastPos, key, value);
            }
          }
        }

        if (type === 'button') {
          tr.setSelection(tr.selection);
        }
      }

      return true;
    });
}
