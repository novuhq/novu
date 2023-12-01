/**
 * Make properties K in T required.
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Transform S to CONSTANT_CASE.
 */
export type ConvertToConstantCase<S extends string> = S extends `${infer T}-${infer U}`
  ? `${Uppercase<T>}_${ConvertToConstantCase<U>}`
  : Uppercase<S>;

/**
 * Helper function to test that Header enum keys and values match correct format.
 *
 * - The enum keys must be in CONSTANT_CASE
 * - The enum values must be in Capital-Case.
 * - The enum values must be the CONSTANT_CASED version of the Capital-Cased value.
 *
 * @example
 * // Correct format:
 * enum TestEnum {
 *   CAPITAL_CASE = 'Capital-Case',
 *   SINGLE = 'Single',
 *   DOUBLEWORD_HEADER = 'DoubleWord-Header',
 * }
 *
 * @example
 * // Incorrect format:
 * enum TestEnum {
 *   Single = 'Single', // incorrect key case (should be CONSTANT_CASE)
 *   SINGLE = 'single', // incorect value case (should be Capital-Case)
 *   // extra underscore in key (should be DOUBLEWORD_HEADER)
 *   DOUBLE_WORD_HEADER = 'DoubleWord-Header',
 * }
 *
 * @param testEnum - the Enum to type check
 */
export declare function testHeaderEnumValidity<
  TEnum extends IConstants,
  TValue extends TEnum[keyof TEnum] & string,
  IConstants = Record<ConvertToConstantCase<TValue>, TValue>
>(
  testEnum: TEnum &
    Record<
      Exclude<keyof TEnum, keyof IConstants>,
      ['Key must be the CONSTANT_CASED version of the Capital-Cased value']
    >
): true;

type IsCapitalCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${Uppercase<T>}${U extends '-' ? `${IsCapitalCase<Exclude<U, '-'>>}` : Uppercase<U>}` extends S
    ? S
    : never
  : never;

// Usage
type Test1 = IsCapitalCase<'Test-Case'>; // 'Test-Case'
type Test2 = IsCapitalCase<'test-case'>; // never
type Test3 = IsCapitalCase<'Test'>; // 'Test'
type Test4 = IsCapitalCase<'test'>; // never
