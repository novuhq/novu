export type TranslationResource = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
};

export enum LocalizationResourceEnum {
  WORKFLOW = 'workflow',
}

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
