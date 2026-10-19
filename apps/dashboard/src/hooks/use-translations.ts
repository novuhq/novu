import { TRANSLATION_DEFAULT_TEMPLATE, TRANSLATION_DELIMITER_CLOSE } from '@novu/shared';
import { EditorView } from '@uiw/react-codemirror';
import { MutableRefObject, useCallback, useState } from 'react';

export interface SelectedTranslation {
  translationKey: string;
  from: number;
  to: number;
}

export function useTranslations(viewRef: MutableRefObject<EditorView | null>, onChange: (value: string) => void) {
  const [selectedTranslation, setSelectedTranslation] = useState<SelectedTranslation | null>(null);

  const handleTranslationSelect = useCallback((translationKey: string, from: number, to: number) => {
    setSelectedTranslation({ translationKey, from, to });
  }, []);

  const handleTranslationUpdate = useCallback(
    (newTranslationExpression: string) => {
      if (!selectedTranslation || !viewRef.current) {
        return;
      }

      const { from, to } = selectedTranslation;

      const transaction = viewRef.current.state.update({
        changes: { from, to, insert: newTranslationExpression },
      });

      viewRef.current.dispatch(transaction);
      onChange(viewRef.current.state.doc.toString());
    },
    [selectedTranslation, viewRef, onChange]
  );

  const handleTranslationDelete = useCallback(() => {
    if (!selectedTranslation || !viewRef.current) {
      return;
    }

    const { from, to } = selectedTranslation;

    const transaction = viewRef.current.state.update({
      changes: { from, to, insert: '' },
    });

    viewRef.current.dispatch(transaction);
    onChange(viewRef.current.state.doc.toString());
    setSelectedTranslation(null);
  }, [selectedTranslation, viewRef, onChange]);

  const handleTranslationReplaceKey = useCallback(
    (newKey: string) => {
      if (!selectedTranslation || !viewRef.current) {
        return;
      }

      // Use the exact positions from the selected translation, just like variables do
      // This prevents finding the wrong occurrence when there are multiple similar translations
      const { from, to } = selectedTranslation;
      const view = viewRef.current;
      const newExpression = TRANSLATION_DEFAULT_TEMPLATE(newKey);

      // Calculate the actual end position by looking for the closing bracket
      // This mimics what the variable plugin does
      const currentContent = view.state.doc.toString();

      const contentAfterFrom = currentContent.slice(from);

      const closingBracketPos = contentAfterFrom.indexOf(TRANSLATION_DELIMITER_CLOSE);
      const actualEnd = closingBracketPos > -1 ? from + closingBracketPos + 2 : to;

      const changes = {
        from,
        to: actualEnd,
        insert: newExpression,
      };

      view.dispatch({
        changes,
        selection: { anchor: from + newExpression.length },
      });

      const newContent = view.state.doc.toString();

      onChange(newContent);

      // Update the selected translation with the new key and positions
      const newSelectedTranslation = {
        translationKey: newKey,
        from,
        to: from + newExpression.length,
      };

      setSelectedTranslation(newSelectedTranslation);
    },
    [selectedTranslation, viewRef, onChange]
  );

  return {
    selectedTranslation,
    setSelectedTranslation,
    handleTranslationSelect,
    handleTranslationUpdate,
    handleTranslationDelete,
    handleTranslationReplaceKey,
  };
}
