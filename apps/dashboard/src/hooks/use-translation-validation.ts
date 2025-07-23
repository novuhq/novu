import { useMemo } from 'react';
import { TranslationKey } from '@/types/translations';

export interface TranslationValidationResult {
  hasError: boolean;
  errorMessage: string;
  isValidKey: boolean;
}

export interface UseTranslationValidationParams {
  translationKey: string;
  availableKeys: TranslationKey[];
  isLoading?: boolean;
  allowEmpty?: boolean;
}

export const useTranslationValidation = ({
  translationKey,
  availableKeys,
  isLoading = false,
  allowEmpty = false,
}: UseTranslationValidationParams): TranslationValidationResult => {
  return useMemo((): TranslationValidationResult => {
    const trimmedKey = translationKey.trim();

    // Don't show error while loading
    if (isLoading) {
      return { hasError: false, errorMessage: '', isValidKey: false };
    }

    // Handle empty key
    if (!trimmedKey) {
      return {
        hasError: !allowEmpty,
        errorMessage: allowEmpty ? '' : 'Translation key is required',
        isValidKey: false,
      };
    }

    if (!availableKeys || availableKeys.length === 0) {
      return { hasError: true, errorMessage: 'Translation key not found in default language.', isValidKey: false };
    }

    const existingKeys = availableKeys.map((key) => key.name);
    const isValidKey = existingKeys.includes(trimmedKey);

    return {
      hasError: !isValidKey,
      errorMessage: isValidKey ? '' : 'Translation key not found in default language.',
      isValidKey,
    };
  }, [translationKey, availableKeys, isLoading, allowEmpty]);
};

/**
 * Simple validation function for use in non-React contexts
 * Used by the translation plugin's class-based components
 */
export const validateTranslationKey = (
  translationKey: string,
  availableKeys: TranslationKey[],
  isLoading = false
): TranslationValidationResult => {
  const trimmedKey = translationKey.trim();

  // Don't show error while loading or empty key
  if (isLoading || !trimmedKey) {
    return { hasError: false, errorMessage: '', isValidKey: false };
  }

  // If no translation keys are provided, show error
  if (!availableKeys || availableKeys.length === 0) {
    return { hasError: true, errorMessage: 'Translation key not found in default language.', isValidKey: false };
  }

  const existingKeys = availableKeys.map((key) => key.name);
  const isValidKey = existingKeys.includes(trimmedKey);

  return {
    hasError: !isValidKey,
    errorMessage: isValidKey ? '' : 'Translation key not found in default language.',
    isValidKey,
  };
};
