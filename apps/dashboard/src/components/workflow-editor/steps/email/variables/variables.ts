import { DIGEST_VARIABLES } from '@/components/variable/utils/digest-variables';
import { Variable, Variables } from '@maily-to/core/extensions';
import type { Editor as TiptapEditor } from '@tiptap/core';

export enum VariableFrom {
  Content = 'content-variable',
  Bubble = 'bubble-variable',
  Repeat = 'repeat-variable',
}

export type CalculateVariablesProps = {
  query: string;
  editor: TiptapEditor;
  from: VariableFrom;
  primitives: Array<Variable>;
  arrays: Array<Variable>;
  namespaces: Array<Variable>;
  isAllowedVariable: (variable: string) => boolean;
  isEnhancedDigestEnabled: boolean;
  addDigestVariables?: boolean;
};

function insertVariable({
  query,
  queryWithoutSuffix,
  editor,
}: {
  query: string;
  queryWithoutSuffix: string;
  editor: TiptapEditor;
}) {
  if (!query.endsWith('}}')) return;

  const from = editor?.state.selection.from - queryWithoutSuffix.length - 4;
  const to = editor?.state.selection.from;

  editor?.commands.deleteRange({ from, to });
  editor?.commands.insertContent({
    type: 'variable',
    attrs: {
      id: queryWithoutSuffix,
      label: null,
      fallback: null,
      showIfKey: null,
      required: false,
    },
  });
}

export const calculateVariables = ({
  query,
  editor,
  from,
  primitives,
  arrays,
  namespaces,
  isAllowedVariable,
  isEnhancedDigestEnabled,
  addDigestVariables = false,
}: CalculateVariablesProps): Variables | undefined => {
  const queryWithoutSuffix = query.replace(/}+$/, '');
  const filteredVariables: Array<Variable> = [];

  const newNamespaces = [...namespaces, ...getRepeatBlockEachVariable(editor)];

  if (isEnhancedDigestEnabled && addDigestVariables) {
    const mappedDigestVariables = DIGEST_VARIABLES.map((variable) => ({
      name: variable.label,
      required: false,
    }));
    filteredVariables.push(...mappedDigestVariables, ...primitives, ...arrays, ...newNamespaces);
  } else {
    filteredVariables.push(...primitives, ...newNamespaces);
  }

  if (isAllowedVariable(queryWithoutSuffix) && isNamespaceVariableName(queryWithoutSuffix, newNamespaces)) {
    filteredVariables.push({ name: queryWithoutSuffix, required: false });
  }

  if (from === VariableFrom.Repeat) {
    filteredVariables.push(...arrays);
    insertVariable({ query, queryWithoutSuffix, editor });
  }

  if (from === VariableFrom.Content) {
    insertVariable({ query, queryWithoutSuffix, editor });
  }

  return dedupAndSortVariables(filteredVariables, queryWithoutSuffix);
};

const isNamespaceVariableName = (variableName: string, namespaces: Array<Variable>): boolean => {
  return namespaces.some((namespace) => variableName.toLowerCase().includes(namespace.name.toLowerCase()));
};

const getRepeatBlockEachVariable = (editor: TiptapEditor): Array<Variable> => {
  const iterableName = editor?.getAttributes('repeat')?.each;

  if (!iterableName) return [];

  return [{ name: iterableName, required: false }];
};

const dedupAndSortVariables = (variables: Array<Variable>, query: string): Array<Variable> => {
  const lowerQuery = query.toLowerCase();

  const filteredVariables = variables.filter((variable) => variable.name.toLowerCase().includes(lowerQuery));

  const uniqueVariables = Array.from(new Map(filteredVariables.map((item) => [item.name, item])).values());

  // Separate digest variables that match the query
  const digestLabels = new Set(DIGEST_VARIABLES.map((v) => v.label));
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
