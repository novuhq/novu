import { TranslationResponseDto } from '@novu/api/models/components';
import { UseMutationResult } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UpdateTranslationValueParams } from '@/hooks/use-update-translation-value';
import { LocalizationResourceEnum } from '@/types/translations';

const getTranslationValue = (content: Record<string, unknown> | undefined, key: string): string => {
  if (!content || !key) return '';

  const keys = key.split('.');
  let current: any = content;

  for (const keyPart of keys) {
    if (current && typeof current === 'object' && keyPart in current) {
      current = current[keyPart];
    } else {
      return '';
    }
  }

  return typeof current === 'string' ? current : '';
};

const useAutoSave = (
  editKey: string,
  editValue: string,
  resourceId: string,
  resourceType: LocalizationResourceEnum,
  updateTranslationValue: UseMutationResult<any, Error, UpdateTranslationValueParams, unknown>,
  hasUserEditedKey: boolean,
  initialKeyOnOpen: string,
  onReplaceKey?: (newKey: string) => void
) => {
  const lastSavedValueRef = useRef<string>('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const trimmedKey = editKey.trim();

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Only proceed if we have a valid key
    if (!trimmedKey) return;

    // Determine what needs to be done
    const needsValueSave = editValue !== lastSavedValueRef.current;
    const needsKeyReplace = hasUserEditedKey && onReplaceKey && trimmedKey !== initialKeyOnOpen;

    if (needsValueSave || needsKeyReplace) {
      // Set timeout for debounced save/replace
      debounceTimeoutRef.current = setTimeout(() => {
        // Save value if it changed
        if (needsValueSave) {
          updateTranslationValue.mutate({
            resourceId,
            resourceType,
            translationKey: trimmedKey,
            translationValue: editValue,
          });
          lastSavedValueRef.current = editValue;
        }

        // Replace key if it was edited
        if (needsKeyReplace) {
          onReplaceKey(trimmedKey);
        }
      }, 500);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    editValue,
    editKey,
    resourceId,
    resourceType,
    updateTranslationValue,
    hasUserEditedKey,
    onReplaceKey,
    initialKeyOnOpen,
  ]);

  return { lastSavedValueRef, debounceTimeoutRef };
};

export const useTranslationEditor = (
  initialKey: string,
  initialValue: string,
  translationData: TranslationResponseDto | null,
  resourceId: string,
  resourceType: LocalizationResourceEnum,
  updateTranslationValue: UseMutationResult<TranslationResponseDto, Error, UpdateTranslationValueParams, unknown>,
  onReplaceKey?: (newKey: string) => void
) => {
  const [editKey, setEditKey] = useState(initialKey);
  const [editValue, setEditValue] = useState(initialValue);
  const [initialKeyOnOpen, setInitialKeyOnOpen] = useState(initialKey);
  const [hasUserEditedKey, setHasUserEditedKey] = useState(false);
  const [hasUserEditedValue, setHasUserEditedValue] = useState(false);

  const actualTranslationValue = useMemo(() => {
    return getTranslationValue(translationData?.content, editKey.trim());
  }, [translationData?.content, editKey]);

  const { lastSavedValueRef, debounceTimeoutRef } = useAutoSave(
    editKey,
    editValue,
    resourceId,
    resourceType,
    updateTranslationValue,
    hasUserEditedKey,
    initialKeyOnOpen,
    onReplaceKey
  );

  useEffect(() => {
    setEditKey(initialKey);
    setInitialKeyOnOpen(initialKey);
    setHasUserEditedKey(false);
    setHasUserEditedValue(false);
  }, [initialKey]);

  useEffect(() => {
    // Only update editValue from server if user hasn't edited the value
    // This prevents overwriting user's typing when server responds
    if (!hasUserEditedValue) {
      const newValue = actualTranslationValue || initialValue;
      setEditValue(newValue);
      lastSavedValueRef.current = newValue;
    }
  }, [actualTranslationValue, initialValue, lastSavedValueRef, hasUserEditedValue]);

  const handleSetEditKey = (newKey: string) => {
    setEditKey(newKey);
    setHasUserEditedKey(true);
  };

  const handleSetEditValue = (newValue: string) => {
    setEditValue(newValue);
    setHasUserEditedValue(true);
  };

  return {
    editKey,
    editValue,
    setEditKey: handleSetEditKey,
    setEditValue: handleSetEditValue,
    isSaving: updateTranslationValue.isPending,
    hasUserEditedKey,
    initialKeyOnOpen,
    lastSavedValueRef,
    debounceTimeoutRef,
  };
};
