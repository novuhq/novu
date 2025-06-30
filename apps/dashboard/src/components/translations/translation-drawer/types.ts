import { LocalizationResourceEnum } from '@novu/dal';

export type TranslationResource = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
};

export type TranslationError = {
  message: string;
  code?: string;
};
