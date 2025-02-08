import { useDataRef } from '@/hooks/use-data-ref';
import { EditorView } from '@uiw/react-codemirror';
import { useCallback, useRef, useState } from 'react';

type SelectedVariable = {
  value: string;
  from: number;
  to: number;
};

/**
 * Manages variable selection and updates in the editor.
 *
 * This hook combines variable selection and update logic:
 * 1. Tracks which variable is currently selected
 * 2. Prevents recursive updates when variables are being modified
 * 3. Handles proper Liquid syntax maintenance
 * 4. Manages cursor position and editor state updates
 */
export function useVariables(viewRef: React.RefObject<EditorView>, onChange: (value: string) => void) {
  const [selectedVariable, setSelectedVariable] = useState<SelectedVariable | null>(null);
  const isUpdatingRef = useRef(false);
  const onChangeRef = useDataRef(onChange);

  const handleVariableSelect = useCallback((value: string, from: number, to: number) => {
    if (isUpdatingRef.current) return;
    setSelectedVariable({ value, from, to });
  }, []);

  const handleVariableUpdate = useCallback(
    (newValue: string) => {
      if (!selectedVariable || !viewRef.current || isUpdatingRef.current) return;

      try {
        isUpdatingRef.current = true;
        const { from, to } = selectedVariable;
        const view = viewRef.current;

        // Function to normalize variable syntax by reducing multiple brackets to two
        const normalizeVariableSyntax = (value: string): string => {
          const strippedValue = value.replace(/[{}]/g, '').trim();

          return `{{${strippedValue}}}`;
        };

        const newVariableText = newValue.match(/^\{+.*\}+$/) ? normalizeVariableSyntax(newValue) : `{{${newValue}}}`;

        // Calculate the actual end position including closing brackets
        const currentContent = view.state.doc.toString();
        const contentAfterFrom = currentContent.slice(from);

        // If there are no next opening brackets, or they come after our closing brackets
        const closingBracketsPos = contentAfterFrom.indexOf('}}');
        const actualEnd = closingBracketsPos > -1 ? from + closingBracketsPos + 2 : to;

        const changes = {
          from,
          to: actualEnd,
          insert: newVariableText,
        };

        view.dispatch({
          changes,
          selection: { anchor: from + newVariableText.length },
        });

        onChangeRef.current(view.state.doc.toString());

        // Update the selected variable with new bounds
        setSelectedVariable(null);
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [selectedVariable, onChangeRef, viewRef]
  );

  return {
    selectedVariable,
    setSelectedVariable,
    handleVariableSelect,
    handleVariableUpdate,
    isUpdatingRef,
  };
}
