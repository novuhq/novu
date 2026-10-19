import { findParentNode } from '@tiptap/core';
import { Fragment, Node } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { Editor } from '@tiptap/react';
import { v4 as uuid } from 'uuid';
import { DEFAULT_COLUMN_WIDTH } from '../nodes/columns/column';

export function getColumnCount(editor: Editor) {
  return getClosestNodeByName(editor, 'columns')?.node?.childCount || 0;
}

export function getClosestNodeByName(editor: Editor, name: string) {
  const { state } = editor.view;
  return findParentNode((node) => node.type.name === name)(state.selection);
}

export function addColumn(editor: Editor) {
  const { node: columnsNode, pos: columnsNodePos = 0 } = getClosestNodeByName(editor, 'columns') || {};
  if (!columnsNode) {
    return;
  }

  const { node: activeColumnNode, pos: activeColumnNodePos = 0 } = getClosestNodeByName(editor, 'column') || {};
  if (!activeColumnNode) {
    return;
  }

  const { state, dispatch } = editor.view;
  const { tr } = state;
  // Get the current columns node position and add the columns size
  // to the end of the columns node
  const calculatedWidth = +Number(100 / (columnsNode.childCount + 1)).toFixed(2);
  const newColumn = state.schema.nodes.column.create(
    {
      width: calculatedWidth,
      columnId: uuid(),
    },
    state.schema.nodes.paragraph.create(null)
  );

  const updatedContent: Node[] = [];
  let activeColumnIndex = 0;
  columnsNode.content.forEach((child, _, index) => {
    if (child.eq(activeColumnNode) && child?.attrs?.columnId === activeColumnNode?.attrs?.columnId) {
      activeColumnIndex = index;
    }

    updatedContent.push(
      child.type.create(
        {
          ...child?.attrs,
          width: calculatedWidth,
        },
        child.content
      )
    );
  });

  updatedContent.splice(activeColumnIndex + 1, 0, newColumn);
  const newColumnPos =
    columnsNodePos + updatedContent.slice(0, activeColumnIndex + 1).reduce((acc, node) => acc + node.nodeSize, 0);

  const updatedColumnsNode = columnsNode.copy(Fragment.from(updatedContent));

  const transaction = tr.replaceWith(columnsNodePos, columnsNodePos + columnsNode.nodeSize, updatedColumnsNode);

  // Calculate the position of the new column by adding the new column's position
  const textSelection = TextSelection.near(transaction.doc.resolve(newColumnPos));
  transaction.setSelection(textSelection);

  dispatch(transaction);
  editor.view.focus();
}

export function removeColumn(editor: Editor) {
  const { node: columnsNode, pos: columnsNodePos = 0 } = getClosestNodeByName(editor, 'columns') || {};
  if (!columnsNode) {
    return;
  }

  const { node: activeColumnNode, pos: activeColumnNodePos = 0 } = getClosestNodeByName(editor, 'column') || {};
  if (!activeColumnNode) {
    return;
  }

  const { state, dispatch } = editor.view;
  const { tr } = state;

  // If there is only one column, remove the entire columns node
  if (columnsNode.childCount === 1) {
    const transaction = tr.delete(columnsNodePos, columnsNodePos + columnsNode.nodeSize);
    dispatch(transaction);
    editor.view.focus();
    return;
  }

  const calculatedWidth = +Number(100 / (columnsNode.childCount - 1)).toFixed(2);

  const updatedContent: Node[] = [];
  let activeColumnIndex = 0;
  let isRemoved = false;
  columnsNode.content.forEach((child, _, index) => {
    const isActiveColumn = child.eq(activeColumnNode) && child?.attrs?.columnId === activeColumnNode?.attrs?.columnId;
    if (isActiveColumn && !isRemoved) {
      activeColumnIndex = index;
      isRemoved = true;
      return;
    }

    updatedContent.push(
      child.type.create(
        {
          ...child?.attrs,
          width: calculatedWidth,
        },
        child.content
      )
    );
  });

  const isLastColumn = activeColumnIndex === columnsNode.childCount - 1;

  const newColumnPos =
    columnsNodePos +
    updatedContent
      .slice(0, isLastColumn ? activeColumnIndex - 1 : activeColumnIndex)
      .reduce((acc, node) => acc + node.nodeSize, 0);

  const updatedColumnsNode = columnsNode.copy(Fragment.from(updatedContent));

  const transaction = tr.replaceWith(columnsNodePos, columnsNodePos + columnsNode.nodeSize, updatedColumnsNode);

  // Calculate the position of the new column by adding the new column's position
  const textSelection = TextSelection.near(transaction.doc.resolve(newColumnPos));
  transaction.setSelection(textSelection);

  dispatch(transaction);
  editor.view.focus();
}

export function goToColumn(editor: Editor, type: 'next' | 'previous') {
  const columnsNode = getClosestNodeByName(editor, 'columns');
  const columnNode = getClosestNodeByName(editor, 'column');
  if (!columnsNode || !columnNode) {
    return false;
  }

  const { state, dispatch } = editor.view;
  // Get the current columns node position and add the columns size
  // to the end of the columns node
  const cols = columnsNode.node;
  let currColumnIndex = 0;
  cols.content.forEach((child, _, index) => {
    if (child.eq(columnNode.node) && child?.attrs?.columnId === columnNode.node?.attrs?.columnId) {
      currColumnIndex = index;
    }
  });

  const nextColumnIndex = type === 'next' ? currColumnIndex + 1 : currColumnIndex - 1;
  // if the next column index is out of bounds, return
  if (nextColumnIndex < 0 || nextColumnIndex >= cols.childCount) {
    return false;
  }

  let nextColumnPos = columnsNode.pos;
  cols.content.forEach((child, _, index) => {
    if (index < nextColumnIndex) {
      nextColumnPos += child.nodeSize;
    }
  });

  const tr = state.tr.setTime(Date.now());
  const textSelection = TextSelection.near(tr.doc.resolve(nextColumnPos));
  tr.setSelection(textSelection);

  dispatch(tr);
  return true;
}

export function updateColumnWidth(editor: Editor, index: number, width: string = 'auto') {
  const { node: columnsNode, pos: columnsNodePos = 0 } = getClosestNodeByName(editor, 'columns') || {};
  if (!columnsNode) {
    return false;
  }

  const { state, dispatch } = editor.view;
  const { tr } = state;
  const { selection } = state;

  const beforeNodeEnd = columnsNodePos + columnsNode.nodeSize;
  const selectionRelative = {
    from: selection.from - columnsNodePos,
    to: selection.to - columnsNodePos,
  };

  const updatedContent: Node[] = [];
  columnsNode.content.forEach((child, _, i) => {
    updatedContent.push(
      child.type.create(
        {
          ...child?.attrs,
          width: i === index ? width : child?.attrs?.width,
        },
        child.content
      )
    );
  });

  const updatedColumnsNode = columnsNode.copy(Fragment.from(updatedContent));
  const transaction = tr.replaceWith(columnsNodePos, beforeNodeEnd, updatedColumnsNode);

  const newSelection = TextSelection.create(
    transaction.doc,
    columnsNodePos + selectionRelative.from,
    columnsNodePos + selectionRelative.to
  );

  dispatch(transaction.setSelection(newSelection));
  return true;
}

export function addColumnByIndex(editor: Editor, index: number = -1) {
  const { node: columnsNode, pos: columnsNodePos = 0 } = getClosestNodeByName(editor, 'columns') || {};
  if (!columnsNode) {
    return false;
  }

  // If the index is out of bounds, append the column to the end
  // of the columns node
  const columnIndex = index < 0 ? columnsNode.childCount : index;
  // Keep the original width of the columns
  // and set the new column width to auto
  const { state } = editor.view;
  const newColumn = state.schema.nodes.column.create(
    {
      width: DEFAULT_COLUMN_WIDTH,
      columnId: uuid(),
    },
    state.schema.nodes.paragraph.create(null)
  );

  // append the new column to the columns node
  // at the specified index
  const updatedContent: Node[] = [];
  columnsNode.content.forEach((child, _, i) => {
    updatedContent.push(child);
    if (i === columnIndex) {
      updatedContent.push(newColumn);
    }
  });

  if (index === -1) {
    updatedContent.push(newColumn);
  }

  const updatedColumnsNode = columnsNode.copy(Fragment.from(updatedContent));
  const transaction = state.tr.replaceWith(columnsNodePos, columnsNodePos + columnsNode.nodeSize, updatedColumnsNode);

  // Set the selection to the new column
  // if the index is out of bounds, set the selection
  // to the last column
  const newColumnPos =
    columnsNodePos + updatedContent.slice(0, columnIndex).reduce((acc, node) => acc + node.nodeSize, 0);

  const textSelection = TextSelection.near(transaction.doc.resolve(newColumnPos));
  transaction.setSelection(textSelection);

  editor.view.dispatch(transaction);
  return true;
}

export function removeColumnByIndex(editor: Editor, index: number = -1) {
  const { node: columnsNode, pos: columnsNodePos = 0 } = getClosestNodeByName(editor, 'columns') || {};
  if (!columnsNode) {
    return false;
  }

  const { state, dispatch } = editor.view;
  const { tr } = state;

  const updatedContent: Node[] = [];
  columnsNode.content.forEach((child, _, i) => {
    if (i !== index) {
      updatedContent.push(child);
    }
  });

  if (index === -1) {
    updatedContent.pop();
  }

  const updatedColumnsNode = columnsNode.copy(Fragment.from(updatedContent));
  const transaction = tr.replaceWith(columnsNodePos, columnsNodePos + columnsNode.nodeSize, updatedColumnsNode);

  // Set the selection to the next column
  // if the index is out of bounds, set the selection
  // to the last column
  const nextColumnIndex = index === columnsNode.childCount - 1 ? index - 1 : index;
  const nextColumnPos =
    columnsNodePos + updatedContent.slice(0, nextColumnIndex).reduce((acc, node) => acc + node.nodeSize, 0);

  const textSelection = TextSelection.near(transaction.doc.resolve(nextColumnPos));
  transaction.setSelection(textSelection);

  dispatch(transaction);
  return true;
}

export function getColumnWidths(editor: Editor): {
  id: string;
  width: string;
}[] {
  const { node: columnsNode, pos: columnsNodePos = 0 } = getClosestNodeByName(editor, 'columns') || {};
  if (!columnsNode) {
    return [];
  }

  const columnsWidth: { id: string; width: string }[] = [];
  columnsNode.content.forEach((child) => {
    const { columnId, width } = child.attrs;
    columnsWidth.push({ id: columnId, width });
  });

  return columnsWidth;
}
