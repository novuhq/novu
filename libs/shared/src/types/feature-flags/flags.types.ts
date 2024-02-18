/**
 * The required format for a boolean flag key.
 */
export type IFlagKey = `IS_${Uppercase<string>}_ENABLED`;

/**
 * Helper function to test that enum keys and values match correct format.
 *
 * It is not possible as of Typescript 5.2 to declare a type for an enum key or value in-line.
 * Therefore we must test the enum via a helper function that abstracts the enum to an object.
 *
 * If the test fails, you should review your `enum` to verify that both the
 * keys and values match the format specified by the `IFlagKey` template literal type.
 * ref: https://stackoverflow.com/a/58181315
 *
 * @param testEnum - the Enum to type check
 */
export function testFlagEnumValidity<TEnum extends IFlags, IFlags = Record<IFlagKey, IFlagKey>>(
  testEnum: TEnum & Record<Exclude<keyof TEnum, keyof IFlags>, ['Key must follow `IFlagKey` format']>
) {}
