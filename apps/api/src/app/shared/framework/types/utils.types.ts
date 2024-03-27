/* cSpell:enableCompoundWords */
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
 * Validate that S is in Http-Header-Case, and return S if valid, otherwise never.
 */
export type ValidateHttpHeaderCase<S extends string> = S extends `${infer U}-${infer V}`
  ? U extends Capitalize<U>
    ? `${U}-${ValidateHttpHeaderCase<V>}`
    : never
  : S extends Capitalize<S>
  ? `${S}` // necessary to cast to string literal type for non-hyphenated enum validation
  : never;

/**
 * Helper function to test that Header enum keys and values match correct format.
 *
 * - The enum keys must be in CONSTANT_CASE
 * - The enum values must be in Http-Header-Case.
 * - The enum values must be the CONSTANT_CASED version of the Http-Header-Cased value.
 *
 * If the test fails, you should review your `enum` to verify that the conditions above are met.
 *
 * @example
 * // Correct format:
 * enum TestEnum {
 *   HEADER = 'Header',
 *   HYPHENATED_HEADER = 'Hyphenated-Header',
 *   DOUBLEWORD_Header = 'DoubleWord-Header',
 * }
 *
 * @example
 * // Incorrect format:
 * enum TestEnum {
 *   Single = 'Single', // incorrect key case (Single should be SINGLE)
 *   SINGLE = 'single', // incorrect value case ('single' should be 'Single')
 *   // extra underscore in key (DOUBLE_WORD_HEADER should be DOUBLEWORD_HEADER)
 *   DOUBLE_WORD_HEADER = 'DoubleWord-Header',
 * }
 *
 * @param testEnum - the Enum to type check
 */
export function testHttpHeaderEnumValidity<
  TEnum extends IConstants,
  TValue extends TEnum[keyof TEnum] & string,
  IConstants = Record<ConvertToConstantCase<TValue>, ValidateHttpHeaderCase<TValue>>
>(
  testEnum: TEnum &
    Record<
      Exclude<keyof TEnum, keyof IConstants>,
      ['Key must be the CONSTANT_CASED version of the Capital-Cased value']
    >
) {}
