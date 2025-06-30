import { useState, useCallback, useEffect } from 'react';
import { Translation } from '@/api/translations';

export function useTranslationEditor(selectedTranslation: Translation | undefined) {
  const [modifiedContent, setModifiedContent] = useState<Record<string, unknown> | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setModifiedContent(null);
    setJsonError(null);
  }, [selectedTranslation?.locale]);

  const handleContentChange = useCallback(
    (newContentString: string) => {
      try {
        const parsed = JSON.parse(newContentString);
        setJsonError(null);

        const hasChanged =
          selectedTranslation && JSON.stringify(parsed) !== JSON.stringify(selectedTranslation.content);

        setModifiedContent(hasChanged ? parsed : null);
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
      }
    },
    [selectedTranslation]
  );

  const resetContent = useCallback(() => {
    setModifiedContent(null);
    setJsonError(null);
  }, []);

  return {
    modifiedContent,
    jsonError,
    handleContentChange,
    resetContent,
    hasUnsavedChanges: !!modifiedContent,
  };
}
