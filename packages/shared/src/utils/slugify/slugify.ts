/* cspell:disable */
/*
 * 15/11/2024
 *
 * Slugify a string.
 *
 * Original code: https://github.com/simov/slugify
 * Enhanced code with custom replacements: https://gist.github.com/glorat/5070ebd2fa275e2012a51300329a7a55
 */

import { transliterate } from './transliterate';

const builtinOverridableReplacements = [
  ['&', ' and '],
  ['🦄', ' unicorn '],
  ['♥', ' love '],
];

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
function escapeStringRegexp(str: string) {
  if (typeof str !== 'string') {
    throw new TypeError('Expected a string');
  }

  return str.replace(matchOperatorsRe, '\\$&');
}

interface Options {
  /**
   *@default '-'
   *@example
   *```
   *import slugify from '@novu/shared';
   *slugify('BAR and baz');
   * //=> 'bar-and-baz'
   *slugify('BAR and baz', {separator: '_'});
   * //=> 'bar_and_baz'
   *slugify('BAR and baz', {separator: ''});
   * //=> 'barandbaz'
   *```
   */
  readonly separator?: string;

  /**
   *Make the slug lowercase.
   *@default true
   *@example
   *```
   *import slugify from '@novu/shared';
   *slugify('Déjà Vu!');
   * //=> 'deja-vu'
   *slugify('Déjà Vu!', {lowercase: false});
   * //=> 'Deja-Vu'
   *```
   */
  readonly lowercase?: boolean;

  /**
   *Convert camelcase to separate words. Internally it does `fooBar` → `foo bar`.
   *@default true
   *@example
   *```
   *import slugify from '@novu/shared';
   *slugify('fooBar');
   * //=> 'foo-bar'
   *slugify('fooBar', {decamelize: false});
   * //=> 'foobar'
   *```
   */
  readonly decamelize?: boolean;

  /**
   *Add your own custom replacements.
   *The replacements are run on the original string before any other transformations.
   *This only overrides a default replacement if you set an item with the same key, like `&`.
   *Add a leading and trailing space to the replacement to have it separated by dashes.
   *@default [ ['&', ' and '], ['🦄', ' unicorn '], ['♥', ' love '] ]
   *@example
   *```
   *import slugify from '@novu/shared';
   *slugify('Foo@unicorn', {
   *customReplacements: [
   *['@', 'at']
   *]
   *});
   * //=> 'fooatunicorn'
   *slugify('foo@unicorn', {
   *customReplacements: [
   *['@', ' at ']
   *]
   *});
   * //=> 'foo-at-unicorn'
   *slugify('I love 🐶', {
   *customReplacements: [
   *['🐶', 'dogs']
   *]
   *});
   * //=> 'i-love-dogs'
   *```
   */
  readonly customReplacements?: ReadonlyArray<[string, string]>;

  /**
   *If your string starts with an underscore, it will be preserved in the slugified string.
   *Sometimes leading underscores are intentional, for example, filenames representing hidden paths on a website.
   *@default false
   *@example
   *```
   *import slugify from '@novu/shared';
   *slugify('_foo_bar');
   * //=> 'foo-bar'
   *slugify('_foo_bar', {preserveLeadingUnderscore: true});
   * //=> '_foo-bar'
   *```
   */
  readonly preserveLeadingUnderscore?: boolean;

  /**
   *If your string ends with a dash, it will be preserved in the slugified string.
   *For example, using slugify on an input field would allow for validation while not preventing the user from writing a slug.
   *@default false
   *@example
   *```
   *import slugify from '@novu/shared';
   *slugify('foo-bar-');
   * //=> 'foo-bar'
   *slugify('foo-bar-', {preserveTrailingDash: true});
   * //=> 'foo-bar-'
   *```
   */
  readonly preserveTrailingDash?: boolean;
}

const decamelize = (string: string) => {
  return (
    string
      // Separate capitalized words.
      .replace(/([A-Z]{2,})(\d+)/g, '$1 $2')
      .replace(/([a-z\d]+)([A-Z]{2,})/g, '$1 $2')

      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      /*
       * `[a-rt-z]` matches all lowercase characters except `s`.
       * This avoids matching plural acronyms like `APIs`.
       */
      .replace(/([A-Z]+)([A-Z][a-rt-z\d]+)/g, '$1 $2')
  );
};

const removeMootSeparators = (string: string, separator: string) => {
  const escapedSeparator = escapeStringRegexp(separator);

  return string
    .replace(new RegExp(`${escapedSeparator}{2,}`, 'g'), separator)
    .replace(new RegExp(`^${escapedSeparator}|${escapedSeparator}$`, 'g'), '');
};

/**
 * Slugify a string.
 *
 * Default behavior:
 * - decamelize
 * - lowercase
 * - remove duplicates of the separator character
 * - remove trailing spaces
 * - remove special characters
 * - multilanguage support
 * - emojis support
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('Hello World');
 * //=> 'hello-world'
 * ```
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('Hello World', { separator: '_' });
 * //=> 'hello_world'
 * ```
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('αβγ');
 * //=> 'avg'
 * ```
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('💯-1️⃣-2️⃣-3️⃣');
 * //=> '100-1-2-3'
 * ```
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('camelCase', { decamelize: true });
 * //=> 'camel-case'
 * ```
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('Hello World', { lowercase: false });
 * //=> 'Hello-World'
 * ```
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('foo@unicorn', { preserveLeadingUnderscore: true });
 * //=> '_foo-at-unicorn'
 * ```
 *
 * @example
 * ```
 * import { slugify } from '@novu/shared';
 * slugify('foo-bar-', { preserveTrailingDash: true });
 * //=> 'foo-bar-'
 * ```
 */
export const slugify = (string: string, options?: Options) => {
  if (typeof string !== 'string') {
    throw new TypeError(`Expected a string, got \`${typeof string}\``);
  }

  options = {
    separator: '-',
    lowercase: true,
    decamelize: true,
    customReplacements: [],
    preserveLeadingUnderscore: false,
    preserveTrailingDash: false,
    ...options,
  };

  const shouldPrependUnderscore = options.preserveLeadingUnderscore && string.startsWith('_');
  const shouldAppendDash = options.preserveTrailingDash && string.endsWith('-');

  const customReplacements = new Map([
    ...(builtinOverridableReplacements as [string, string][]),
    ...(options.customReplacements as [string, string][]),
  ]);

  string = transliterate(string, { customReplacements: Array.from(customReplacements) });

  if (options.decamelize) {
    string = decamelize(string);
  }

  let patternSlug = /[^a-zA-Z\d]+/g;

  if (options.lowercase) {
    string = string.toLowerCase();
    patternSlug = /[^a-z\d]+/g;
  }

  string = string.replace(patternSlug, options.separator ?? '-');
  string = string.replace(/\\/g, '');

  /*
   * Detect contractions/possessives by looking for any word followed by a `-t`
   * or `-s` in isolation and then remove it.
   */
  string = string.replace(/([a-zA-Z\d]+)-([ts])(-|$)/g, '$1$2$3');

  if (options.separator) {
    string = removeMootSeparators(string, options.separator);
  }

  if (shouldPrependUnderscore) {
    string = `_${string}`;
  }

  if (shouldAppendDash) {
    string = `${string}-`;
  }

  return string;
};
