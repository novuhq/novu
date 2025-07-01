export type TranslationResource = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
};

export type TranslationError = {
  message: string;
  code?: string;
};

export enum LocalizationResourceEnum {
  WORKFLOW = 'workflow',
}
