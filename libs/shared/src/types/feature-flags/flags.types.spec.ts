import { IFlagKey, testFlagEnumValidity } from './flags.types';
import { FeatureFlagsKeysEnum } from './feature-flags';
import { SystemCriticalFlagsEnum } from './system-critical-flags';

describe('Flags', () => {
  /**
   * This describe block resolves the Jest error of a test suite not having any tests.
   * It has no other purpose.
   */
  it('tests the Typescript compiler errors below', () => {
    expect(true).toEqual(true);
  });
});

/**
 * Type Error tests for template literal types - Flag naming
 * `export` is specified to avoid false-positive issue of:
 * "<value> is declared but its value is never read."
 *
 * https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
 */

/**
 * IFlagKey tests
 */
// Valid
export const validFlag: IFlagKey = 'IS_SOMETHING_ENABLED';

// @ts-expect-error - Missing `IS_` prefix
export const invalidPrefixFlag: IFlagKey = 'SOMETHING_ENABLED';

// @ts-expect-error - Missing `_ENABLED` suffix
export const invalidSuffixFlag: IFlagKey = 'IS_SOMETHING';

// @ts-expect-error - Incorrect subject casing
export const invalidSubjectFlag: IFlagKey = 'IS_something_ENABLED';

/**
 * testFlagEnumValidity Tests
 */
enum ValidFlagsEnum {
  IS_SOMETHING_ENABLED = 'IS_SOMETHING_ENABLED',
  IS_SOMETHING_ELSE_ENABLED = 'IS_SOMETHING_ELSE_ENABLED',
}
testFlagEnumValidity(ValidFlagsEnum);

enum InvalidKeyFlagsEnum {
  IS_SOMETHING_ENABLED = 'IS_SOMETHING_ENABLED',
  INVALID_ENABLED = 'IS_INVALID_ENABLED',
}
// @ts-expect-error - Invalid key - INVALID_ENABLED
testFlagEnumValidity(InvalidKeyFlagsEnum);
enum InvalidValueFlagsEnum {
  IS_SOMETHING_ENABLED = 'IS_SOMETHING_ENABLED',
  IS_INVALID_ENABLED = 'INVALID_ENABLED',
}
// @ts-expect-error - Invalid value on IS_INVALID_ENABLED: 'INVALID_ENABLED'
testFlagEnumValidity(InvalidValueFlagsEnum);

/**
 * Verifying declared FlagEnums
 */
testFlagEnumValidity(FeatureFlagsKeysEnum);
testFlagEnumValidity(SystemCriticalFlagsEnum);
