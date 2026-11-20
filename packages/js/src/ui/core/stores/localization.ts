import { Accessor, createMemo } from 'solid-js';
import {
  defaultInboxLocalization,
  defaultLocalization,
  defaultSubscriptionLocalization,
  dynamicLocalization,
} from '../../config/defaultLocalization';
import { normalizeIntlLocale } from '../format/normalizeIntlLocale';

export type InboxLocalizationKey = keyof typeof defaultInboxLocalization;
export type SubscriptionLocalizationKey = keyof typeof defaultSubscriptionLocalization;
export type AllLocalizationKey = InboxLocalizationKey | SubscriptionLocalizationKey;

export type StringLocalizationKey = {
  [K in AllLocalizationKey]: (typeof defaultLocalization)[K] extends string ? K : never;
}[AllLocalizationKey];

export type AllLocalization = {
  [K in AllLocalizationKey]?: (typeof defaultLocalization)[K] extends (...args: infer P) => infer R
    ? ((...args: P) => R) | string
    : string;
} & {
  dynamic?: Record<string, string>;
};
export type InboxLocalization = {
  [K in InboxLocalizationKey]?: (typeof defaultInboxLocalization)[K] extends (...args: infer P) => infer R
    ? ((...args: P) => R) | string
    : string;
} & {
  dynamic?: Record<string, string>;
};
export type SubscriptionLocalization = {
  [K in SubscriptionLocalizationKey]?: (typeof defaultSubscriptionLocalization)[K] extends (...args: infer P) => infer R
    ? ((...args: P) => R) | string
    : string;
} & {
  dynamic?: Record<string, string>;
};

type TranslateFunctionArg<K extends AllLocalizationKey> = K extends keyof typeof defaultLocalization
  ? (typeof defaultLocalization)[K] extends (arg: infer A) => unknown
    ? A
    : undefined
  : undefined;

export type TranslateFunction = <K extends AllLocalizationKey>(
  key: K,
  ...args: TranslateFunctionArg<K> extends undefined
    ? [undefined?] // No arguments needed if TranslateFunctionArg<K> is undefined
    : [TranslateFunctionArg<K>] // A single argument is required if TranslateFunctionArg<K> is defined
) => string;

/** What a key resolves to once merged: a string, or a function that builds one from the argument `t` receives. */
export type LocalizationValue = string | ((...args: never[]) => string);

export type LocalizationStore = {
  t: TranslateFunction;
  locale: Accessor<string>;
  /** The merged dictionary `t` reads from; hosts subscribe to it to re-render when any string changes. */
  dictionary: Accessor<Record<string, LocalizationValue>>;
};

/** Merges the defaults, the dynamic strings received from the API and the host's overrides into one dictionary. */
export const createLocalizationStore = (localization: Accessor<AllLocalization | undefined>): LocalizationStore => {
  const dictionary = createMemo<Record<string, LocalizationValue>>(() => {
    const { dynamic, ...localizationObject } = localization() || {};

    return {
      ...defaultLocalization,
      ...dynamicLocalization(),
      ...(dynamic || {}),
      ...localizationObject,
    };
  });

  const t: TranslateFunction = (key, ...args) => {
    const value = dictionary()[key];
    if (typeof value === 'function') {
      // the dictionary erases each function's argument type; `TranslateFunction` re-establishes it per key
      const translate = value as (argument: (typeof args)[0]) => string;

      return translate(args[0]);
    }

    return value as string;
  };

  const locale = createMemo(() => normalizeIntlLocale(dictionary().locale as string));

  return { t, locale, dictionary };
};
