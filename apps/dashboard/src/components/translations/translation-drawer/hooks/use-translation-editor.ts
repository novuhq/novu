import { TranslationResponseDto } from '@novu/api/models/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useTranslationEditor(selectedTranslation: TranslationResponseDto | undefined) {
  const [modifiedContentString, setModifiedContentString] = useState<string | null>(null);
  const [modifiedContent, setModifiedContent] = useState<Record<string, any> | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const originalContent = useMemo(
    () => JSON.stringify(selectedTranslation?.content ?? {}, null, 2),
    [selectedTranslation?.content]
  );

  useEffect(() => {
    setModifiedContentString(null);
    setModifiedContent(null);
    setJsonError(null);
  }, [selectedTranslation?.locale]);

  const handleContentChange = useCallback((newContentString: string) => {
    // Store the raw string content without any reformatting
    setModifiedContentString(newContentString);

    try {
      // Only parse for validation, don't modify the content
      setModifiedContent(JSON.parse(newContentString));
      setJsonError(null);
    } catch (error) {
      setModifiedContent(null);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  }, []);

  const resetContent = useCallback(() => {
    setModifiedContentString(null);
    setModifiedContent(null);
    setJsonError(null);
  }, []);

  const hasUnsavedChanges =
    !modifiedContentString || !selectedTranslation ? false : modifiedContentString !== originalContent;

  return {
    originalContent,
    modifiedContent,
    modifiedContentString,
    jsonError,
    handleContentChange,
    resetContent,
    hasUnsavedChanges,
  };
}
