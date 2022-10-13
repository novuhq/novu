import { EN } from './languages/en';
import { FI } from './languages/fi';
import { FR } from './languages/fr';
import { HI } from './languages/hi';
import { ID } from './languages/id';
import { IT } from './languages/it';
import { KA } from './languages/ka';
import { MR } from './languages/mr';
import { MS } from './languages/ms';
import { RU } from './languages/ru';
import { UK } from './languages/uk';
import { ES } from './languages/es';
import { GL } from './languages/gl';
import { FA } from './languages/fa';
import { AR } from './languages/ar';
import { GU } from './languages/gu';
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
import { PA } from './languages/pa';
import { TA } from './languages/ta';
import { SD } from './languages/sd';
import { CA } from './languages/ca';
import { IG } from './languages/ig';
import { KO } from './languages/ko';
import { KU } from './languages/ku';
import { EL } from './languages/el';
import { JA } from './languages/ja';
import { HU } from './languages/hu';
import { BG } from './languages/bg';
import { DA } from './languages/da';
import { AS } from './languages/as';
import { AZ } from './languages/az';
import { SI } from './languages/si';
import { NO } from './languages/no';
import { PT } from './languages/pt';
import { SV } from './languages/sv';
import { TR } from './languages/tr';
import { TE } from './languages/te';
import { LO } from './languages/lo';
import { RO } from './languages/ro';
import { VI } from './languages/vi';
import { ZU } from './languages/zu';
import { NL } from './languages/nl';
import { UZ } from './languages/uz';
import { TH } from './languages/th';
import { HE } from './languages/he';
import { KM } from './languages/km';
import { HY } from './languages/hy';
import { KK } from './languages/kk';
import { TL } from './languages/tl';
import { EU } from './languages/eu';

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
  ro: RO,
  fi: FI,
  hi: HI,
  fr: FR,
  gu: GU,
  ru: RU,
  es: ES,
  gl: GL,
  id: ID,
  it: IT,
  ka: KA,
  ig: IG,
  mr: MR,
  ms: MS,
  ar: AR,
  fa: FA,
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
  pa: PA,
  ta: TA,
  sd: SD,
  ca: CA,
  ko: KO,
  ku: KU,
  el: EL,
  ja: JA,
  sv: SV,
  hu: HU,
  bg: BG,
  da: DA,
  as: AS,
  az: AZ,
  si: SI,
  no: NO,
  pt: PT,
  tr: TR,
  te: TE,
  lo: LO,
  vi: VI,
  zu: ZU,
  nl: NL,
  uz: UZ,
  th: TH,
  he: HE,
  km: KM,
  hy: HY,
  kk: KK,
  tl: TL,
  eu: EU,
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
  | 'ro'
  | 'fi'
  | 'hi'
  | 'id'
  | 'it'
  | 'ka'
  | 'gu'
  | 'mr'
  | 'ms'
  | 'ru'
  | 'uk'
  | 'es'
  | 'gl'
  | 'ar'
  | 'fa'
  | 'fr'
  | 'de'
  | 'ig'
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
  | 'sv'
  | 'sd'
  | 'ca'
  | 'pa'
  | 'ta'
  | 'ko'
  | 'bg'
  | 'ku'
  | 'el'
  | 'ja'
  | 'hu'
  | 'da'
  | 'si'
  | 'pt'
  | 'tr'
  | 'as'
  | 'az'
  | 'no'
  | 'te'
  | 'da'
  | 'vi'
  | 'zu'
  | 'nl'
  | 'uz'
  | 'lo'
  | 'th'
  | 'he'
  | 'hy'
  | 'kk'
  | 'km'
  | 'tl'
  | 'eu';
