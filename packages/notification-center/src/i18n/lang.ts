import { EN } from './languages/en';
import { FI } from './languages/fi';
import { FR } from './languages/fr';
import { HI } from './languages/hi';
import { IT } from './languages/it';
import { RU } from './languages/ru';
import { UK } from './languages/uk';
import { SP } from './languages/sp';
import { FA } from './languages/fa';
import { AR } from './languages/ar';
import { GJ } from './languages/gj';

export interface ITranslationContent {
  readonly notifications: string;
  readonly markAllAsRead: string;
  readonly poweredBy: string;
}

export interface ITranslationEntry {
  readonly translations: ITranslationContent;
  readonly lang: string;
}

export const TRANSLATIONS: Record<I18NLanguage, ITranslationEntry> = {
  en: EN,
  fi: FI,
  hi: HI,
  it: IT,
  ar: AR,
  fa: FA
  fr: FR
  gj: GJ,
  ru: RU,
  uk: UK,
  sp: SP
};

/**
 * Should use the short notations of the W3C internationalization document
 * https://www.science.co.il/language/Codes.php
 *
 * For example:
 * - For English use "en"
 * - For French use "fr"
 */
export type I18NLanguage = 'en' | 'fi' | 'hi' | 'it' | 'gj' | 'ru' | 'uk' | 'sp' | 'ar' | 'fa' | 'fr';
