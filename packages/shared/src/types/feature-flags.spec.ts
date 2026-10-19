import { describe, expect, it } from 'vitest';
import { FlagKey, testFlagEnumValidity } from './feature-flags';

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
 * FlagKey tests
 */
// Valid
export const validFlag: FlagKey = 'IS_SOMETHING_ENABLED';

// @ts-expect-error - Missing `IS_` prefix
export const invalidPrefixFlag: FlagKey = 'SOMETHING_ENABLED';

// @ts-expect-error - Missing `_ENABLED` suffix
export const invalidSuffixFlag: FlagKey = 'IS_SOMETHING';

// @ts-expect-error - Incorrect subject casing
export const invalidSubjectFlag: FlagKey = 'IS_something_ENABLED';

/**
 * testFlagEnumValidity Tests
 */
enum ValidFlagsEnum {
  IS_SOMETHING_ENABLED = 'IS_SOMETHING_ENABLED',
  IS_SOMETHING_ELSE_ENABLED = 'IS_SOMETHING_ELSE_ENABLED',
}
testFlagEnumValidity(ValidFlagsEnum);

enum InvalidFlagsEnum {
  INVALID_ENABLED = 'INVALID_ENABLED',
}
// @ts-expect-error - not matching pattern
testFlagEnumValidity(InvalidFlagsEnum);

enum NonMatchingKeyValueEnum {
  IS_SOMETHING_ENABLED = 'IS_SOMETHING_ELSE_ENABLED',
}

// Ensure that the keys and values of FeatureFlagsKeysEnum match
type ValidateNonMatchingKeyValueEnum = {
  [K in keyof typeof NonMatchingKeyValueEnum]: K extends FlagKey ? K : `Value doesn't match key`;
};
// @ts-expect-error - non matching key-value pair in enum
const validateNonMatchingKeyValueEnum: ValidateNonMatchingKeyValueEnum = NonMatchingKeyValueEnum;
