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

const getVariablesByContext = (
  editor: TiptapEditor,
  from: VariableFrom,
  isEnhancedDigestEnabled: boolean,
  primitives: Array<LiquidVariable>,
  arrays: Array<LiquidVariable>,
  namespaces: Array<LiquidVariable>
): LiquidVariable[] => {
  const iterables = [...arrays, ...getRepeatBlockEachVariables(editor)];
  const isInRepeatBlock = isInsideRepeatBlock(editor);

  switch (from) {
    // Case 1: Inside repeat block's "each" key input - only allow iterables
    case VariableFrom.RepeatEachKey:
      if (isInRepeatBlock) {
        updateRepeatBlockChildAliases(editor, isEnhancedDigestEnabled);
        return iterables;
      }

      return [];

    // Case 2: Bubble menu (showIf) - allow only primitives and namespaces
    case VariableFrom.Bubble:
      return [...primitives, ...namespaces];

    // Case 3: Regular content
    case VariableFrom.Content: {
      const baseVariables = [...primitives, ...namespaces, ...iterables];

      // If we're not in a repeat block, return all variables
      if (!isInRepeatBlock || !isEnhancedDigestEnabled) {
        return baseVariables;
      }

      // If we're in a repeat block, return only the iterable properties (current + children)
      const iterableName = editor?.getAttributes('repeat')?.each;
      if (!iterableName) return baseVariables;

      // Get all variables that are children of the iterable/alias
      const iterableProperties = [...namespaces, ...arrays, ...primitives]
        .filter((variable) => variable.name.startsWith(iterableName))
        .flatMap((variable) => {
          // If the variable name is exactly the iterableName, skip
          if (variable.name === iterableName) {
            return [];
          }

          // Otherwise, get the last part after the iterableName
          const suffix = variable.name.split('.').pop();
          return suffix ? [{ name: `${REPEAT_BLOCK_ITERABLE_ALIAS}.${suffix}` }] : [];
        });

      // Return all variables, including the iterable alias and its properties
      return [...baseVariables, ...iterableProperties, { name: REPEAT_BLOCK_ITERABLE_ALIAS }];
    }

    default:
      return [];
  }
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

  // Get available variables by context (where we are in the editor)
  const variables = getVariablesByContext(editor, from, isEnhancedDigestEnabled, primitives, arrays, namespaces);

  // Add currently typed variable if allowed
  if (
    queryWithoutSuffix.trim() &&
    isAllowedVariable({
      name: queryWithoutSuffix,
      aliasFor: resolveRepeatBlockAlias(queryWithoutSuffix, editor, isEnhancedDigestEnabled),
    })
  ) {
    variables.push({ name: queryWithoutSuffix });
  }

  insertVariableToEditor({ query, editor, isAllowedVariable, isEnhancedDigestEnabled });

  return dedupAndSortVariables(variables, queryWithoutSuffix);
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

const getRepeatBlockEachVariables = (editor: TiptapEditor): Array<LiquidVariable> => {
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
