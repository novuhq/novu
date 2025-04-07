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

  function addInlineVariable() {
    if (!query.endsWith('}}')) return;
    if (filteredVariables.every((variable) => variable.name !== queryWithoutSuffix)) return;

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

  if (from === VariableFrom.Repeat) {
    filteredVariables.push(...arrays, ...namespaces);

    if (isAllowedVariable(queryWithoutSuffix)) {
      filteredVariables.push({ name: queryWithoutSuffix, required: false });
    }

    addInlineVariable();
    return dedupAndSortVariables(filteredVariables, queryWithoutSuffix);
  }

  const iterableName = editor?.getAttributes('repeat')?.each;
  const newNamespaces = [...namespaces, ...(iterableName ? [{ name: iterableName, required: false }] : [])];

  filteredVariables.push(...primitives, ...newNamespaces);

  if (newNamespaces.some((namespace) => queryWithoutSuffix.includes(namespace.name))) {
    filteredVariables.push({ name: queryWithoutSuffix, required: false });
  }

  if (from === VariableFrom.Content) {
    addInlineVariable();
  }

  return dedupAndSortVariables(filteredVariables, queryWithoutSuffix);
};

export const dedupAndSortVariables = (variables: Array<Variable>, query: string): Array<Variable> => {
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
