import { useCallback, useEffect, useState } from 'react';
import { Translation } from '@/api/translations';

export function useTranslationEditor(selectedTranslation: Translation | undefined) {
  const [modifiedContentString, setModifiedContentString] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setModifiedContentString(null);
    setJsonError(null);
  }, [selectedTranslation?.locale]);

  const handleContentChange = useCallback((newContentString: string) => {
    // Store the raw string content without any reformatting
    setModifiedContentString(newContentString);

    try {
      // Only parse for validation, don't modify the content
      JSON.parse(newContentString);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  }, []);

  const resetContent = useCallback(() => {
    setModifiedContentString(null);
    setJsonError(null);
  }, []);

  const parseModifiedContent = useCallback(() => {
    if (!modifiedContentString || jsonError) {
      return null;
    }

    try {
      return JSON.parse(modifiedContentString);
    } catch {
      return null;
    }
  }, [modifiedContentString, jsonError]);

  const checkIfContentChanged = useCallback(() => {
    if (!modifiedContentString || !selectedTranslation) {
      return false;
    }

    const originalContent = JSON.stringify(selectedTranslation.content, null, 2);
    return modifiedContentString !== originalContent;
  }, [modifiedContentString, selectedTranslation]);

  const modifiedContent = parseModifiedContent();
  const hasUnsavedChanges = checkIfContentChanged();

  return {
    modifiedContent,
    modifiedContentString,
    jsonError,
    handleContentChange,
    resetContent,
    hasUnsavedChanges,
  };
}
