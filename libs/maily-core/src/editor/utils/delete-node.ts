import { type Editor, findParentNode } from '@tiptap/core';

export function deleteNode(editor: Editor, nodeType: string) {
  const { state } = editor.view;
  const associatedNode = findParentNode((node) => node.type.name === nodeType)(state.selection);

  if (!associatedNode) {
    return;
  }

  const from = associatedNode.pos;
  const to = from + associatedNode.node.nodeSize;

  const { tr } = state;
  const transaction = tr.delete(from, to);
  editor.view.dispatch(transaction);
}
