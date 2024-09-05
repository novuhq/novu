/**
 * The required format for an error code.
 */
export type IErrorCodeKey = `${Uppercase<string>}_ERROR`;
export type IErrorCodeVal = `${Capitalize<string>}Error`;

/**
 * Helper function to test that enum keys and values match correct format.
 *
 * It is not possible as of Typescript 5.2 to declare a type for an enum key or value in-line.
 * Therefore we must test the enum via a helper function that abstracts the enum to an object.
 *
 * If the test fails, you should review your `enum` to verify that
 * * keys match the format specified by the `IErrorCodeKey` template literal type.
 * * values match the format specified by the `IErrorCodeVal` template literal type.
 * * keys are CONSTANT_CASED versions of the PascalCased values.
 * ref: https://stackoverflow.com/a/58181315
 *
 * @param testEnum - the Enum to type check
 */
export function testErrorCodeEnumValidity<TEnum extends Record<IErrorCodeKey, IErrorCodeVal>>(
  testEnum: TEnum &
    Record<
      Exclude<keyof TEnum, keyof Record<ToConstantCaseForString<TEnum[keyof TEnum] & string>, TEnum[keyof TEnum]>>,
      ['Key must be CONSTANT_CASED version of the PascalCased value']
    >
): void {}

/**
 * Helper function to convert a PascalCase string to CONSTANT_CASE.
 */
type PascalToConstant<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${First extends Capitalize<First> ? '_' : ''}${Uppercase<First>}${PascalToConstant<Rest>}`
  : '';

/**
 * Convert a PascalCase string to CONSTANT_CASE.
 *
 * @example
 * ```ts
 * type Test = PascalToConstant<"FirstName">; // "FIRST_NAME"
 * ```
 */
export type ToConstantCaseForString<T extends string> =
  PascalToConstant<T> extends `_${infer WithoutUnderscore}` ? WithoutUnderscore : PascalToConstant<T>;
