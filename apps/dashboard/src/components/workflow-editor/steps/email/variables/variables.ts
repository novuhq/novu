import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import type { Editor, Editor as TiptapEditor, Range } from '@tiptap/core';

export const REPEAT_BLOCK_ITERABLE_ALIAS = 'current';

export const ALLOWED_ALIASES = [REPEAT_BLOCK_ITERABLE_ALIAS];

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
  primitives: Array<LiquidVariable>;
  arrays: Array<LiquidVariable>;
  namespaces: Array<LiquidVariable>;
  isAllowedVariable: IsAllowedVariable;
  isEnhancedDigestEnabled: boolean;
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
  isEnhancedDigestEnabled,
  range,
}: {
  query: string;
  editor: TiptapEditor;
  isAllowedVariable: IsAllowedVariable;
  isEnhancedDigestEnabled: boolean;
  range?: { from: number; to: number };
}) => {
  // if we type then we need to close, if we accept suggestion then it has range
  const isClosedVariable = query.endsWith('}}') || range;
  if (!isClosedVariable) return;

  const queryWithoutSuffix = query.replace(/}+$/, '');

  const aliasFor = resolveRepeatBlockAlias(queryWithoutSuffix, editor, isEnhancedDigestEnabled);
  const variable: LiquidVariable = { name: queryWithoutSuffix, aliasFor };

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
  isEnhancedDigestEnabled,
}: CalculateVariablesProps): Array<LiquidVariable> | undefined => {
  const queryWithoutSuffix = query.replace(/}+$/, '');
  const filteredVariables: Array<LiquidVariable> = [];
  const iterables = [...arrays, ...getRepeatBlockEachVariable(editor)];

  if (isInsideRepeatBlock(editor)) {
    // Case 1: Inside repeat block's "each" key input - only allow iterables
    if (from === VariableFrom.RepeatEachKey) {
      filteredVariables.push(...iterables);
      updateRepeatBlockChildAliases(editor, isEnhancedDigestEnabled);
    }

    // Case 2: Inside repeat block's content - allow all variables + iterable alias
    if (from === VariableFrom.Content) {
      filteredVariables.push(...primitives, ...namespaces, ...iterables);

      if (isEnhancedDigestEnabled) {
        filteredVariables.push({ name: REPEAT_BLOCK_ITERABLE_ALIAS });
      }
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
    filteredVariables.push({ name: queryWithoutSuffix });
  }

  insertVariableToEditor({ query, editor, isAllowedVariable, isEnhancedDigestEnabled });

  return dedupAndSortVariables(filteredVariables, queryWithoutSuffix);
};

export function isAllowedAlias(variableName: string): boolean {
  const nameRoot = variableName.split('.')[0];

  return ALLOWED_ALIASES.includes(nameRoot);
}

export const resolveRepeatBlockAlias = (
  variable: string,
  editor: Editor,
  isEnhancedDigestEnabled: boolean
): string | null => {
  if (!isEnhancedDigestEnabled) return null;

  const variableRoot = variable.split('.')[0];

  if (isAllowedAlias(variableRoot) && isInsideRepeatBlock(editor)) {
    return variable.replace(variableRoot, editor.getAttributes('repeat')?.each);
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
const updateRepeatBlockChildAliases = (editor: Editor, isEnhancedDigestEnabled: boolean) => {
  if (!isEnhancedDigestEnabled) return;
  const repeat = findRepeatBlock(editor);

  if (!repeat) return;

  editor
    .chain()
    .command(({ tr }) => {
      const { block, depth } = repeat;
      const repeatPos = editor.state.selection.$from.before(depth);

      block.content.descendants((node, pos) => {
        if (node.type.name === 'variable' && node.attrs.aliasFor) {
          const newAlias = resolveRepeatBlockAlias(node.attrs.id, editor, isEnhancedDigestEnabled);
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

const getRepeatBlockEachVariable = (editor: TiptapEditor): Array<LiquidVariable> => {
  const iterableName = editor?.getAttributes('repeat')?.each;

  if (!iterableName) return [];

  return [{ name: iterableName }];
};

const dedupAndSortVariables = (variables: Array<LiquidVariable>, query: string): Array<LiquidVariable> => {
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
