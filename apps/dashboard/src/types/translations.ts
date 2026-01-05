import { ResourceType } from '@novu/api/models/components';

// Re-export SDK type with const values for runtime usage
export type LocalizationResourceEnum = ResourceType;
export const LocalizationResourceEnum = {
  WORKFLOW: 'workflow',
  LAYOUT: 'layout',
} as const;

export type TranslationResource = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
};

export type TranslationKey = {
  name: string;
};

export type TranslationCompletionOption = {
  label: string;
  type: 'translation' | 'new-translation-key';
  boost?: number;
  displayLabel?: string;
  info?: () => { dom: HTMLElement; destroy: () => void };
};

export type TranslationAutocompleteConfig = {
  translationKeys: TranslationKey[];
  onTranslationSelect?: (completion: TranslationCompletionOption) => void;
  onCreateNewTranslationKey?: (translationKey: string) => Promise<void>;
};
