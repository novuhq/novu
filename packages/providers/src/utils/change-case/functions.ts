// Regexps involved with splitting words in various case formats.
const SPLIT_LOWER_UPPER_REGEXP = /([\p{Ll}\d])(\p{Lu})/gu;
const SPLIT_UPPER_UPPER_REGEXP = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;

// Regexp involved with stripping non-word characters from the result.
const DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;

// The replacement value for splits.
const SPLIT_REPLACE_VALUE = '$1\0$2';

// The default characters to keep after transforming case.
const DEFAULT_PREFIX_SUFFIX_CHARACTERS = '';

/**
 * Supported locale values. Use `false` to ignore locale.
 * Defaults to `undefined`, which uses the host environment.
 */
export type Locale = string[] | string | false | undefined;

/**
 * Options used for converting strings to any case.
 */
export interface IOptions {
  locale?: Locale;
  split?: (value: string) => string[];
  delimiter?: string;
  prefixCharacters?: string;
  suffixCharacters?: string;
  keyCaseTransformer?: (key: string) => string;
  depth?: number;
}

/**
 * Options used for converting strings to pascal/camel case.
 */
export interface IPascalCaseOptions extends IOptions {
  mergeAmbiguousCharacters?: boolean;
}

/**
 * Split any cased input strings into an array of words.
 */
export function split(value: string): string[] {
  let result = value.trim();

  result = result
    .replace(SPLIT_LOWER_UPPER_REGEXP, SPLIT_REPLACE_VALUE)
    .replace(SPLIT_UPPER_UPPER_REGEXP, SPLIT_REPLACE_VALUE);

  result = result.replace(DEFAULT_STRIP_REGEXP, '\0');

  let start = 0;
  let end = result.length;

  // Trim the delimiter from around the output string.
  while (result.charAt(start) === '\0') start += 1;
  if (start === end) return [];
  while (result.charAt(end - 1) === '\0') end -= 1;

  return result.slice(start, end).split(/\0/g);
}

/**
 * Convert a string to space separated lower case (`foo bar`).
 */
export function noCaseTransformer(input: string, options?: IOptions): string {
  const { prefix, words, suffix } = splitPrefixSuffix(input, options);

  return (
    prefix +
    words.map(lowerFactory(options?.locale)).join(options?.delimiter ?? ' ') +
    suffix
  );
}

/**
 * Convert a string to camel case (`fooBar`).
 */
export function camelCaseTransformer(
  input: string,
  options?: IPascalCaseOptions,
): string {
  const { prefix, words, suffix } = splitPrefixSuffix(input, options);
  const lower = lowerFactory(options?.locale);
  const upper = upperFactory(options?.locale);
  const transform = options?.mergeAmbiguousCharacters
    ? capitalCaseTransformFactory(lower, upper)
    : pascalCaseTransformFactory(lower, upper);

  return (
    prefix +
    words
      .map((word, index) => {
        if (index === 0) return lower(word);

        return transform(word, index);
      })
      .join(options?.delimiter ?? '') +
    suffix
  );
}

/**
 * Convert a string to pascal case (`FooBar`).
 */
export function pascalCaseTransformer(
  input: string,
  options?: IPascalCaseOptions,
): string {
  const { prefix, words, suffix } = splitPrefixSuffix(input, options);
  const lower = lowerFactory(options?.locale);
  const upper = upperFactory(options?.locale);
  const transform = options?.mergeAmbiguousCharacters
    ? capitalCaseTransformFactory(lower, upper)
    : pascalCaseTransformFactory(lower, upper);

  return prefix + words.map(transform).join(options?.delimiter ?? '') + suffix;
}

/**
 * Convert a string to pascal snake case (`Foo_Bar`).
 */
export function pascalSnakeCaseTransformer(
  input: string,
  options?: IOptions,
): string {
  return capitalCaseTransformer(input, { delimiter: '_', ...options });
}

/**
 * Convert a string to capital case (`Foo Bar`).
 */
export function capitalCaseTransformer(
  input: string,
  options?: IOptions,
): string {
  const { prefix, words, suffix } = splitPrefixSuffix(input, options);
  const lower = lowerFactory(options?.locale);
  const upper = upperFactory(options?.locale);

  return (
    prefix +
    words
      .map(capitalCaseTransformFactory(lower, upper))
      .join(options?.delimiter ?? '') +
    suffix
  );
}

/**
 * Convert a string to constant case (`FOO_BAR`).
 */
export function constantCaseTransformer(
  input: string,
  options?: IOptions,
): string {
  const { prefix, words, suffix } = splitPrefixSuffix(input, options);

  return (
    prefix +
    words.map(upperFactory(options?.locale)).join(options?.delimiter ?? '_') +
    suffix
  );
}

/**
 * Convert a string to dot case (`foo.bar`).
 */
export function dotCaseTransformer(input: string, options?: IOptions): string {
  return noCaseTransformer(input, { delimiter: '.', ...options });
}

/**
 * Convert a string to kebab case (`foo-bar`).
 */
export function kebabCaseTransformer(
  input: string,
  options?: IOptions,
): string {
  return noCaseTransformer(input, { delimiter: '-', ...options });
}

/**
 * Convert a string to path case (`foo/bar`).
 */
export function pathCaseTransformer(input: string, options?: IOptions): string {
  return noCaseTransformer(input, { delimiter: '/', ...options });
}

/**
 * Convert a string to path case (`Foo bar`).
 */
export function sentenceCaseTransformer(
  input: string,
  options?: IOptions,
): string {
  const { prefix, words, suffix } = splitPrefixSuffix(input, options);
  const lower = lowerFactory(options?.locale);
  const upper = upperFactory(options?.locale);
  const transform = capitalCaseTransformFactory(lower, upper);

  return (
    prefix +
    words
      .map((word, index) => {
        if (index === 0) return transform(word);

        return lower(word);
      })
      .join(options?.delimiter ?? '') +
    suffix
  );
}

/**
 * Convert a string to snake case (`foo_bar`).
 */
export function snakeCaseTransformer(
  input: string,
  options?: IOptions,
): string {
  return noCaseTransformer(input, { delimiter: '_', ...options });
}

/**
 * Convert a string to header case (`Foo-Bar`).
 */
export function trainCaseTransformer(
  input: string,
  options?: IOptions,
): string {
  return capitalCaseTransformer(input, { delimiter: '-', ...options });
}

function lowerFactory(locale: Locale): (input: string) => string {
  return locale === false
    ? (input: string) => input.toLowerCase()
    : (input: string) => input.toLocaleLowerCase(locale);
}

function upperFactory(locale: Locale): (input: string) => string {
  return locale === false
    ? (input: string) => input.toUpperCase()
    : (input: string) => input.toLocaleUpperCase(locale);
}

function capitalCaseTransformFactory(
  lower: (input: string) => string,
  upper: (input: string) => string,
): (word: string) => string {
  return (word: string) => `${upper(word[0])}${lower(word.slice(1))}`;
}

function pascalCaseTransformFactory(
  lower: (input: string) => string,
  upper: (input: string) => string,
): (word: string, index: number) => string {
  return (word: string, index: number) => {
    const char0 = word[0];
    const initial =
      index > 0 && char0 >= '0' && char0 <= '9' ? `_${char0}` : upper(char0);

    return initial + lower(word.slice(1));
  };
}

function splitPrefixSuffix(
  input: string,
  options: IOptions = {},
): {
  prefix: string;
  words: string[];
  suffix: string;
} {
  const splitFn = options.split ?? split;
  const prefixCharacters =
    options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
  const suffixCharacters =
    options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
  let prefixIndex = 0;
  let suffixIndex = input.length;

  while (prefixIndex < input.length) {
    const char = input.charAt(prefixIndex);
    if (!prefixCharacters.includes(char)) break;
    prefixIndex += 1;
  }

  while (suffixIndex > prefixIndex) {
    const index = suffixIndex - 1;
    const char = input.charAt(index);
    if (!suffixCharacters.includes(char)) break;
    suffixIndex = index;
  }

  return {
    prefix: input.slice(0, prefixIndex),
    words: splitFn(input.slice(prefixIndex, suffixIndex)),
    suffix: input.slice(suffixIndex),
  };
}
