import { Variable } from '@maily-to/core/extensions';
import { TRANSLATION_NAMESPACE_SEPARATOR } from '@novu/shared';
import type { Editor, Range, Editor as TiptapEditor } from '@tiptap/core';
import { VariableFrom } from '@/components/maily/types';
import { DIGEST_VARIABLES } from '@/components/variable/utils/digest-variables';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import {
  isInsideRepeatBlock,
  REPEAT_BLOCK_ITERABLE_ALIAS,
  resolveRepeatBlockAlias,
  updateRepeatBlockChildAliases,
} from './repeat-block-aliases';

export type CalculateVariablesProps = {
  query: string;
  editor: TiptapEditor;
  from: VariableFrom;
  primitives: Array<LiquidVariable>;
  arrays: Array<LiquidVariable>;
  namespaces: Array<LiquidVariable>;
  isAllowedVariable: IsAllowedVariable;
  addDigestVariables?: boolean;
  isPayloadSchemaEnabled?: boolean;
  isTranslationEnabled?: boolean;
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
  range,
}: {
  query: string;
  editor: TiptapEditor;
  range?: { from: number; to: number };
}) => {
  // if we type then we need to close, if we accept suggestion then it has range
  const isClosedVariable = query.endsWith('}}') || range;
  if (!isClosedVariable) return;

  const queryWithoutSuffix = query.replace(/}+$/, '');

  const aliasFor = resolveRepeatBlockAlias(queryWithoutSuffix, editor);

  // Calculate range for manual typing if not provided by suggestion
  const calculatedRange = range || {
    from: Math.max(0, editor.state.selection.from - queryWithoutSuffix.length - 4), // -4 for '{{ }}'
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

const getVariablesByContext = ({
  editor,
  from,
  primitives,
  arrays,
  namespaces,
  addDigestVariables,
}: {
  editor: TiptapEditor;
  from: VariableFrom;
  primitives: Array<LiquidVariable>;
  arrays: Array<LiquidVariable>;
  namespaces: Array<LiquidVariable>;
  addDigestVariables: boolean;
}): LiquidVariable[] => {
  const iterables = [...arrays, ...getRepeatBlockEachVariables(editor)];
  const isInRepeatBlock = isInsideRepeatBlock(editor);

  const getVariables = () => {
    const baseVariables = [...primitives, ...namespaces, ...iterables];

    if (!isInRepeatBlock && addDigestVariables) {
      const mappedDigestVariables = DIGEST_VARIABLES.map((variable) => ({
        name: variable.name,
      }));
      baseVariables.push(...mappedDigestVariables);
    }

    // If we're not in a repeat block, return all variables
    if (!isInRepeatBlock) {
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

        // Handle array payload variables (e.g., "steps.digest-step.events[0].payload.xxx")
        if (variable.name?.startsWith(iterableName + '[0].payload.')) {
          const suffix = variable.name.replace(iterableName + '[0].', '');
          return [{ name: `${REPEAT_BLOCK_ITERABLE_ALIAS}.${suffix}` }];
        }

        // Handle other nested properties - get the last part after the iterableName
        const suffix = variable.name.split('.').pop();

        return suffix ? [{ name: `${REPEAT_BLOCK_ITERABLE_ALIAS}.${suffix}` }] : [];
      });

    // Return all variables, including the iterable alias and its properties
    return [...baseVariables, ...iterableProperties, { name: REPEAT_BLOCK_ITERABLE_ALIAS }];
  };

  switch (from) {
    // Case 1: Inside repeat block's "each" key input - only allow iterables
    case VariableFrom.RepeatEachKey:
      if (isInRepeatBlock) {
        updateRepeatBlockChildAliases(editor);
        return iterables;
      }

      return [];

    // Case 2: Bubble menu (showIf) - allow only primitives and namespaces
    case VariableFrom.Bubble:
      return getVariables();

    // Case 3: Regular content
    case VariableFrom.Content: {
      return getVariables();
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
  addDigestVariables = false,
  isPayloadSchemaEnabled = false,
  isTranslationEnabled = false,
}: CalculateVariablesProps): Array<LiquidVariable> | undefined => {
  const queryWithoutSuffix = query.replace(/}+$/, '');

  // Get available variables by context (where we are in the editor)
  const variables = getVariablesByContext({
    editor,
    from,
    primitives,
    arrays,
    namespaces,
    addDigestVariables,
  });

  // Add new variable creation support for payload variables when schema is enabled
  const PAYLOAD_NAMESPACE = 'payload';

  if (
    isPayloadSchemaEnabled &&
    queryWithoutSuffix.trim() &&
    (queryWithoutSuffix.startsWith(PAYLOAD_NAMESPACE + '.') ||
      queryWithoutSuffix.startsWith('current.' + PAYLOAD_NAMESPACE + '.')) &&
    queryWithoutSuffix !== PAYLOAD_NAMESPACE
  ) {
    const variableKey = queryWithoutSuffix
      .replace('current.' + PAYLOAD_NAMESPACE + '.', '')
      .replace(PAYLOAD_NAMESPACE + '.', '');

    // Check if this variable doesn't already exist
    const existingVariable = variables.find((v) => v.name === queryWithoutSuffix);

    if (!existingVariable && variableKey.trim()) {
      variables.unshift({
        name: queryWithoutSuffix,
        type: 'new-variable',
        isNewSuggestion: true,
        displayLabel: `Create ${queryWithoutSuffix}`,
        boost: 100, // Boost to show at top
      });
    }
  }

  // Add translation namespace variable when translations are enabled
  // This provides discoverability for the translation system by showing "t" in the variables list
  // When selected, it inserts "{{t." which triggers the translation extension to show translation keys
  if (isTranslationEnabled && from === VariableFrom.Content) {
    variables.unshift({
      name: TRANSLATION_NAMESPACE_SEPARATOR,
      displayLabel: 't.',
      boost: 100,
    });
  }

  // Add currently typed variable if allowed
  if (
    queryWithoutSuffix.trim() &&
    isAllowedVariable({
      name: queryWithoutSuffix,
      aliasFor: resolveRepeatBlockAlias(queryWithoutSuffix, editor),
    })
  ) {
    const existingVariable = variables.find((v) => v.name === queryWithoutSuffix);

    if (!existingVariable) {
      variables.push({ name: queryWithoutSuffix });
    }
  }

  /* Skip variable insertion by closing "}}" for bubble menus since they require special handling:
   * 1. They use different positioning logic compared to content variables
   * 2. Each menu type (repeat, button, etc.) handles variables differently
   * 3. For now bubble variables can be only added via Enter key which triggers a separate insertion flow
   *    (which is external somewhere in TipTap or Maily)
   */
  if (from === VariableFrom.Content && isAllowedVariable({ name: queryWithoutSuffix })) {
    insertVariableToEditor({ query, editor });
  }

  return dedupAndSortVariables(variables, queryWithoutSuffix);
};

const getRepeatBlockEachVariables = (editor: TiptapEditor): Array<LiquidVariable> => {
  const iterableName = editor?.getAttributes('repeat')?.each;

  if (!iterableName) return [];

  return [{ name: iterableName }];
};

const dedupAndSortVariables = (variables: Array<Variable>, query: string): Array<Variable> => {
  const lowerQuery = query.toLowerCase();

  const filteredVariables = variables.filter((variable) => variable.name.toLowerCase().includes(lowerQuery));

  const uniqueVariables = Array.from(new Map(filteredVariables.map((item) => [item.name, item])).values());

  // Separate digest variables that match the query
  const digestLabels = new Set(DIGEST_VARIABLES.map((v) => v.name));
  const matchedDigestVariables: Variable[] = [];
  const others: Variable[] = [];

  for (const variable of uniqueVariables) {
    if (digestLabels.has(variable.name)) {
      matchedDigestVariables.push(variable);
    } else {
      others.push(variable);
    }
  }

  // Sort the non-digest variables
  const sortedOthers = others.sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerQuery;
    const bExact = b.name.toLowerCase() === lowerQuery;
    const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
    const bStarts = b.name.toLowerCase().startsWith(lowerQuery);

    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.name.localeCompare(b.name);
  });

  return [...matchedDigestVariables, ...sortedOthers];
};
