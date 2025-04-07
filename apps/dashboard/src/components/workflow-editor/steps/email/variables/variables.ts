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
}: CalculateVariablesProps): Variables | undefined => {
  const queryWithoutSuffix = query.replace(/}+$/, '');
  const filteredVariables: Array<Variable> = [];

  const newNamespaces = [...namespaces, ...getRepeatBlockEachVariable(editor)];

  filteredVariables.push(...primitives, ...newNamespaces);

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
