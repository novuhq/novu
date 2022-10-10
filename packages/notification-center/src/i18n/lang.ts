import { EN } from './languages/en';
import { FI } from './languages/fi';
import { FR } from './languages/fr';
import { HI } from './languages/hi';
import { IT } from './languages/it';
import { KA } from './languages/ka';
import { MR } from './languages/mr';
import { RU } from './languages/ru';
import { UK } from './languages/uk';
import { ES } from './languages/es';
import { FA } from './languages/fa';
import { AR } from './languages/ar';
import { GJ } from './languages/gj';
import { DE } from './languages/de';
import { BN } from './languages/bn';
import { ML } from './languages/ml';
import { ZH } from './languages/zh';
import { HR } from './languages/hr';
import { OR } from './languages/or';
import { SA } from './languages/sa';
import { NE } from './languages/ne';
import { UR } from './languages/ur';
import { PL } from './languages/pl';
import { CS } from './languages/cs';
import { PU } from './languages/pu';
import { TA } from './languages/ta';
import { KO } from './languages/ko';

export interface ITranslationContent {
  readonly notifications: string;
  readonly markAllAsRead: string;
  readonly poweredBy: string;
  readonly settings: string;
}

export interface ITranslationEntry {
  readonly translations: Partial<ITranslationContent>;
  readonly lang: string;
}

export const TRANSLATIONS: Record<I18NLanguage, ITranslationEntry> = {
  en: EN,
  fi: FI,
  hi: HI,
  it: IT,
  ar: AR,
  fa: FA,
  fr: FR,
  gj: GJ,
  ru: RU,
  es: ES,
  ka: KA,
  mr: MR,
  uk: UK,
  de: DE,
  bn: BN,
  ml: ML,
  zh: ZH,
  hr: HR,
  or: OR,
  sa: SA,
  ur: UR,
  ne: NE,
  pl: PL,
  cs: CS,
  pu: PU,
  ta: TA,
  ko: KO,
};

/**
 * Should use the short notations of the W3C internationalization document
 * https://www.science.co.il/language/Codes.php
 *
 * For example:
 * - For English use "en"
 * - For French use "fr"
 *
 * Any new language should also be added to the documentation
 * https://docs.novu.co/notification-center/react-components#customize-the-ui-language
 */
export type I18NLanguage =
  | 'en'
  | 'fi'
  | 'hi'
  | 'it'
  | 'ka'
  | 'mr'
  | 'gj'
  | 'ru'
  | 'uk'
  | 'es'
  | 'ar'
  | 'fa'
  | 'fr'
  | 'de'
  | 'bn'
  | 'ml'
  | 'zh'
  | 'hr'
  | 'or'
  | 'sa'
  | 'ur'
  | 'ne'
  | 'pl'
  | 'cs'
  | 'pu'
  | 'ta'
  | 'ko';
