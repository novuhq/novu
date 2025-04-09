import { VariableWithContext } from '@/components/variable/types';
import { IsAllowedVariable } from '@/utils/parseStepVariables';
import { Variable, Variables } from '@maily-to/core/extensions';
import type { Editor, Editor as TiptapEditor, Range } from '@tiptap/core';

export const REPEAT_BLOCK_ITERABLE_ALIAS = 'current';

export enum VariableFrom {
  // variable coming from bubble menu (e.g. 'showIf')
  Bubble = 'bubble-variable',
  // variable coming from repeat block 'each' input
  RepeatEachKey = 'repeat-variable',
  // all the other variables
  Content = 'content-variable',
}

export type CalculateVariablesProps = {
  query: string;
  editor: TiptapEditor;
  from: VariableFrom;
  primitives: Array<Variable>;
  arrays: Array<Variable>;
  namespaces: Array<Variable>;
  isAllowedVariable: IsAllowedVariable;
};

const insertNodeToEditor = ({
  editor,
  range,
  nodeType,
  nodeAttrs,
}: {
  editor: Editor;
  range: Range;
  nodeType: string;
  nodeAttrs: Record<string, any>;
}) => {
  const nodeAfter = editor.view.state.selection.$to.nodeAfter;
  const overrideSpace = nodeAfter?.text?.startsWith(' ');

  // add space after variable if it's a text node
  if (overrideSpace) {
    range.to += 1;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      {
        type: nodeType,
        attrs: nodeAttrs,
      },
      {
        type: 'text',
        text: ' ',
      },
    ])
    .run();
};

export const insertVariableToEditor = ({
  query,
  editor,
  isAllowedVariable,
  range,
}: {
  query: string;
  editor: TiptapEditor;
  isAllowedVariable: IsAllowedVariable;
  range?: { from: number; to: number };
}) => {
  // if we type then we need to close, if we accept suggestion then it has range
  const isClosedVariable = query.endsWith('}}') || range;
  if (!isClosedVariable) return;

  const queryWithoutSuffix = query.replace(/}+$/, '');

  const aliasFor = resolveRepeatBlockAlias(queryWithoutSuffix, editor);
  const variable: VariableWithContext = { name: queryWithoutSuffix, aliasFor };

  if (!isAllowedVariable(variable)) return;

  // Calculate range for manual typing if not provided by suggestion
  const calculatedRange = range || {
    from: editor.state.selection.from - queryWithoutSuffix.length - 4, // -4 for '{{ }}'
    to: editor.state.selection.from,
  };

  insertNodeToEditor({
    editor,
    range: calculatedRange,
    nodeType: 'variable',
    nodeAttrs: {
      id: queryWithoutSuffix,
      aliasFor,
      label: null,
      fallback: null,
      showIfKey: null,
      required: false,
    },
  });
};

export const calculateVariables = ({
  query,
  editor,
  from,
  primitives,
  arrays,
  namespaces,
  isAllowedVariable,
}: CalculateVariablesProps): Variables | undefined => {
  const queryWithoutSuffix = query.replace(/}+$/, '');
  const filteredVariables: Array<Variable> = [];
  const iterables = [...arrays, ...getRepeatBlockEachVariable(editor)];

  if (isInsideRepeatBlock(editor)) {
    // Case 1: Inside repeat block's "each" key input - only allow iterables
    if (from === VariableFrom.RepeatEachKey) {
      filteredVariables.push(...iterables);
      updateRepeatBlockChildAliases(editor);
    }

    // Case 2: Inside repeat block's content - allow all variables + iterable alias
    if (from === VariableFrom.Content) {
      filteredVariables.push(...primitives, ...namespaces, ...iterables);
      filteredVariables.push({ name: REPEAT_BLOCK_ITERABLE_ALIAS, required: false });
    }
  } else {
    // Case 3: Regular content outside repeat block - allow all variables except iterable alias
    filteredVariables.push(...primitives, ...namespaces, ...iterables);
  }

  // Case 4: Bubble menu (showIf) - allow only primitives and namespaces
  if (from === VariableFrom.Bubble) {
    filteredVariables.push(...primitives, ...namespaces);
  }

  // Otherwise, add what's being typed if it's allowed
  if (queryWithoutSuffix.trim() !== '' && isAllowedVariable({ name: queryWithoutSuffix })) {
    filteredVariables.push({ name: queryWithoutSuffix, required: false });
  }

  insertVariableToEditor({ query, editor, isAllowedVariable });

  return dedupAndSortVariables(filteredVariables, queryWithoutSuffix);
};

export const resolveRepeatBlockAlias = (variable: string, editor: Editor): string | null => {
  if (variable.startsWith(REPEAT_BLOCK_ITERABLE_ALIAS) && isInsideRepeatBlock(editor)) {
    return variable.replace(REPEAT_BLOCK_ITERABLE_ALIAS, editor.getAttributes('repeat')?.each);
  }

  return null;
};

const findRepeatBlock = (editor: Editor) => {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'repeat') {
      return { block: $from.node(depth), depth };
    }
  }

  return null;
};

/**
 * Updates the 'aliasFor' attribute for all child nodes of the selected repeat block,
 * when the repeat block iterable changes.
 *
 * @example
 * iterable: 'payload.comments' => 'payload.blogs'
 * variable aliasFor: 'payload.comments.author' => 'payload.blogs.author'
 */
const updateRepeatBlockChildAliases = (editor: Editor) => {
  const repeat = findRepeatBlock(editor);

  if (!repeat) return;

  editor
    .chain()
    .command(({ tr }) => {
      const { block, depth } = repeat;
      const repeatPos = editor.state.selection.$from.before(depth);

      block.content.descendants((node, pos) => {
        if (node.type.name === 'variable' && node.attrs.aliasFor) {
          const newAlias = resolveRepeatBlockAlias(node.attrs.id, editor);
          tr.setNodeMarkup(repeatPos + pos + 1, null, { ...node.attrs, aliasFor: newAlias });
        }
      });
      return true;
    })
    .run();
};

const isInsideRepeatBlock = (editor: TiptapEditor): boolean => {
  return findRepeatBlock(editor) !== null;
};

const getRepeatBlockEachVariable = (editor: TiptapEditor): Array<Variable> => {
  const iterableName = editor?.getAttributes('repeat')?.each;

  if (!iterableName) return [];

  return [{ name: iterableName, required: false }];
};

const dedupAndSortVariables = (variables: Array<Variable>, query: string): Array<Variable> => {
  const filteredVariables = variables.filter((variable) => variable.name.toLowerCase().includes(query.toLowerCase()));

  const uniqueVariables = Array.from(new Map(filteredVariables.map((item) => [item.name, item])).values());

  return uniqueVariables.sort((a, b) => {
    const aExactMatch = a.name.toLowerCase() === query.toLowerCase();
    const bExactMatch = b.name.toLowerCase() === query.toLowerCase();
    const aStartsWithQuery = a.name.toLowerCase().startsWith(query.toLowerCase());
    const bStartsWithQuery = b.name.toLowerCase().startsWith(query.toLowerCase());

    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;
    if (aStartsWithQuery && !bStartsWithQuery) return -1;
    if (!aStartsWithQuery && bStartsWithQuery) return 1;

    return a.name.localeCompare(b.name);
  });
};
