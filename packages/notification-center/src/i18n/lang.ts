import { EN } from './languages/en';
import { FI } from './languages/fi';
import { HI } from './languages/hi';
import { SP } from './languages/sp';
import { IT } from './languages/it';
import { BN } from './languages/bn';
import { RU } from './languages/ru';
import { FA } from './languages/fa';
import { AR } from './languages/ar';

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
  sp: SP,
  it: IT,
  bn: BN,
  ru: RU,
  ar: AR,
  fa: FA
};

/**
 * Should use the short notations of the W3C internationalization document
 * https://www.w3.org/International/O-charset-lang.html
 *
 * For example:
 * - For English use "en"
 * - For French use "fr"
 * - For Hindi use "hi"
 * - For Italian use "it"
 * - For Bengali use "bn"
 * - For Russian use "ru"
 * - For Arabic use "ar"
 * - For Persian use "fa"
 */
export type I18NLanguage = 'en' | 'fi' | 'hi' | 'sp' | 'it' | 'bn' | 'ru' | 'ar' | 'fa';
