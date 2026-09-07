import { TranslationResponseDto } from '@novu/api/models/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

function escapeControlCharsInJsonStrings(jsonString: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      result += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      const code = char.charCodeAt(0);
      if (code < 0x20) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += `\\u${code.toString(16).padStart(4, '0')}`;
        }
        continue;
      }
    }

    result += char;
  }

  return result;
}

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
    setModifiedContentString(newContentString);

    try {
      setModifiedContent(JSON.parse(newContentString));
      setJsonError(null);
    } catch (error) {
      try {
        const sanitized = escapeControlCharsInJsonStrings(newContentString);
        setModifiedContent(JSON.parse(sanitized));
        setJsonError(null);
      } catch {
        setModifiedContent(null);
        setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
      }
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
