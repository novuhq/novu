import { AF } from './languages/af';
import { AM } from './languages/am';
import { AR } from './languages/ar';
import { AS } from './languages/as';
import { AZ } from './languages/az';
import { BE } from './languages/be';
import { BG } from './languages/bg';
import { BH } from './languages/bh';
import { BN } from './languages/bn';
import { BS } from './languages/bs';
import { CA } from './languages/ca';
import { CS } from './languages/cs';
import { DA } from './languages/da';
import { DE } from './languages/de';
import { EL } from './languages/el';
import { EN } from './languages/en';
import { ES } from './languages/es';
import { EU } from './languages/eu';
import { FA } from './languages/fa';
import { FI } from './languages/fi';
import { FR } from './languages/fr';
import { GA } from './languages/ga';
import { GL } from './languages/gl';
import { GU } from './languages/gu';
import { HE } from './languages/he';
import { HI } from './languages/hi';
import { HR } from './languages/hr';
import { HU } from './languages/hu';
import { HY } from './languages/hy';
import { ID } from './languages/id';
import { IG } from './languages/ig';
import { IT } from './languages/it';
import { JA } from './languages/ja';
import { KA } from './languages/ka';
import { KK } from './languages/kk';
import { KM } from './languages/km';
import { KN } from './languages/kn';
import { KO } from './languages/ko';
import { KU } from './languages/ku';
import { LO } from './languages/lo';
import { LT } from './languages/lt';
import { LV } from './languages/lv';
import { ML } from './languages/ml';
import { MR } from './languages/mr';
import { MS } from './languages/ms';
import { NB } from './languages/nb';
import { NE } from './languages/ne';
import { NL } from './languages/nl';
import { OR } from './languages/or';
import { PA } from './languages/pa';
import { PL } from './languages/pl';
import { PT } from './languages/pt';
import { RO } from './languages/ro';
import { RU } from './languages/ru';
import { SA } from './languages/sa';
import { SD } from './languages/sd';
import { SI } from './languages/si';
import { SM } from './languages/sm';
import { SQ } from './languages/sq';
import { SV } from './languages/sv';
import { TA } from './languages/ta';
import { TE } from './languages/te';
import { TH } from './languages/th';
import { TL } from './languages/tl';
import { TR } from './languages/tr';
import { UK } from './languages/uk';
import { UR } from './languages/ur';
import { UZ } from './languages/uz';
import { VI } from './languages/vi';
import { ZH } from './languages/zh';
import { ZU } from './languages/zu';
import { BA } from './languages/ba';

export interface ITranslationContent {
  readonly notifications: string;
  readonly markAllAsRead: string;
  readonly poweredBy: string;
  readonly settings: string;
  readonly removeMessage: string;
  readonly markAsRead: string;
  readonly markAsUnRead: string;
  readonly noNewNotification: string;
}

export interface ITranslationEntry {
  readonly translations: Partial<ITranslationContent>;
  readonly lang: string;
}

export const TRANSLATIONS: Record<I18NLanguage, ITranslationEntry> = {
  af: AF,
  am: AM,
  ar: AR,
  as: AS,
  az: AZ,
  be: BE,
  bg: BG,
  bh: BH,
  bn: BN,
  bs: BS,
  ca: CA,
  cs: CS,
  da: DA,
  de: DE,
  el: EL,
  en: EN,
  es: ES,
  eu: EU,
  fa: FA,
  fi: FI,
  fr: FR,
  ga: GA,
  gl: GL,
  gu: GU,
  he: HE,
  hi: HI,
  hr: HR,
  hu: HU,
  hy: HY,
  id: ID,
  ig: IG,
  it: IT,
  ja: JA,
  ka: KA,
  kk: KK,
  km: KM,
  kn: KN,
  ko: KO,
  ku: KU,
  lo: LO,
  lt: LT,
  lv: LV,
  ml: ML,
  mr: MR,
  ms: MS,
  ne: NE,
  nl: NL,
  nb: NB,
  or: OR,
  pa: PA,
  pl: PL,
  pt: PT,
  ro: RO,
  ru: RU,
  sa: SA,
  sd: SD,
  si: SI,
  sm: SM,
  sq: SQ,
  sv: SV,
  ta: TA,
  te: TE,
  th: TH,
  tl: TL,
  tr: TR,
  uk: UK,
  ur: UR,
  uz: UZ,
  vi: VI,
  zh: ZH,
  zu: ZU,
  ba: BA,
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
 * https://docs.novu.co/notification-center/client/react/customization#customize-the-ui-language
 */
export type I18NLanguage =
  | 'af'
  | 'am'
  | 'ar'
  | 'as'
  | 'az'
  | 'ba'
  | 'be'
  | 'bg'
  | 'bh'
  | 'bn'
  | 'bs'
  | 'ca'
  | 'cs'
  | 'da'
  | 'de'
  | 'el'
  | 'en'
  | 'es'
  | 'eu'
  | 'fa'
  | 'fi'
  | 'fr'
  | 'ga'
  | 'gl'
  | 'gu'
  | 'he'
  | 'hi'
  | 'hr'
  | 'hu'
  | 'hy'
  | 'id'
  | 'ig'
  | 'it'
  | 'ja'
  | 'ka'
  | 'kk'
  | 'km'
  | 'kn'
  | 'ko'
  | 'ku'
  | 'lo'
  | 'lt'
  | 'lv'
  | 'ml'
  | 'mr'
  | 'ms'
  | 'nb'
  | 'ne'
  | 'nl'
  | 'or'
  | 'pa'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'sa'
  | 'sd'
  | 'si'
  | 'sm'
  | 'sq'
  | 'sv'
  | 'ta'
  | 'te'
  | 'th'
  | 'tl'
  | 'tr'
  | 'uk'
  | 'ur'
  | 'uz'
  | 'vi'
  | 'zh'
  | 'zu';
